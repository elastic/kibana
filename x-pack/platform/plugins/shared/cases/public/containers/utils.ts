/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, transform, snakeCase, isEmpty } from 'lodash';
import { fold } from 'fp-ts/Either';
import { identity, pipe as v2Pipe } from 'fp-ts/function';
import { pipe } from 'fp-ts/pipeable';

import type { ToastInputFields } from '@kbn/core/public';
import { builderMap as customFieldsBuilder } from '../components/custom_fields/builder';
import {
  AttachmentType,
  CaseRt,
  CasesRt,
  ConfigurationRt,
  ConfigurationsRt,
  UserActionsRt,
} from '../../common/types/domain';
import type {
  CasePatchRequest,
  CaseResolveResponse,
  CaseUserActionStatsResponse,
  FindCasesContainingAllAlertsResponse,
  SingleCaseMetricsResponse,
} from '../../common/types/api';
import {
  CaseResolveResponseRt,
  CaseUserActionStatsResponseRt,
  FindCasesContainingAllAlertsResponseRt,
  SingleCaseMetricsResponseRt,
} from '../../common/types/api';
import type {
  Case,
  Cases,
  Configuration,
  Configurations,
  User,
  UserActions,
} from '../../common/types/domain';
import { NO_ASSIGNEES_FILTERING_KEYWORD } from '../../common/constants';
import { throwErrors } from '../../common/api';
import type { CaseUI, FilterOptions, UpdateByKey } from './types';
import * as i18n from './translations';
import type { CustomFieldFactoryFilterOption } from '../components/custom_fields/types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const covertToSnakeCase = (obj: Record<string, unknown>) =>
  transform(obj, (acc: Record<string, unknown>, value, key, target) => {
    const camelKey = Array.isArray(target) ? key : snakeCase(key);
    acc[camelKey] = isObject(value) ? covertToSnakeCase(value as Record<string, unknown>) : value;
  });

export const createToasterPlainError = (message: string) => new ToasterError([message]);

export const decodeCaseResponse = (respCase?: Case) =>
  pipe(CaseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseResolveResponse = (respCase?: CaseResolveResponse) =>
  pipe(
    CaseResolveResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeSingleCaseMetricsResponse = (respCase?: SingleCaseMetricsResponse) =>
  pipe(
    SingleCaseMetricsResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesResponse = (respCase?: Cases) =>
  pipe(CasesRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseConfigurationsResponse = (respCase?: Configurations) => {
  return pipe(
    ConfigurationsRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );
};

export const decodeCaseConfigureResponse = (respCase?: Configuration) =>
  pipe(ConfigurationRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseUserActionsResponse = (respUserActions?: UserActions) =>
  pipe(UserActionsRt.decode(respUserActions), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseUserActionStatsResponse = (
  caseUserActionsStats: CaseUserActionStatsResponse
) =>
  pipe(
    CaseUserActionStatsResponseRt.decode(caseUserActionsStats),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeFindAllAttachedAlertsResponse = (
  respCase?: FindCasesContainingAllAlertsResponse
) =>
  v2Pipe(
    FindCasesContainingAllAlertsResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const valueToUpdateIsSettings = (
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): value is CasePatchRequest['settings'] => key === 'settings';

export const valueToUpdateIsStatus = (
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): value is CasePatchRequest['status'] => key === 'status';

export class ToasterError extends Error {
  public readonly messages: string[];

  constructor(messages: string[]) {
    super(messages[0]);
    this.name = 'ToasterError';
    this.messages = messages;
  }
}
export const createUpdateSuccessToaster = (
  caseBeforeUpdate: CaseUI,
  caseAfterUpdate: CaseUI,
  key: UpdateByKey['updateKey'],
  value: UpdateByKey['updateValue']
): ToastInputFields => {
  const caseHasAlerts = caseBeforeUpdate.comments.some(
    (comment) => comment.type === AttachmentType.alert
  );

  const toast: ToastInputFields = {
    title: i18n.UPDATED_CASE(caseAfterUpdate.title),
    className: 'eui-textBreakWord',
  };

  if (
    valueToUpdateIsSettings(key, value) &&
    value?.syncAlerts &&
    caseHasAlerts &&
    caseBeforeUpdate.settings.syncAlerts !== value?.syncAlerts
  ) {
    return {
      ...toast,
      title: i18n.SYNC_CASE(caseAfterUpdate.title),
    };
  }

  if (
    valueToUpdateIsSettings(key, value) &&
    caseBeforeUpdate.settings.extractObservables !== value?.extractObservables
  ) {
    return {
      ...toast,
      title: i18n.EXTRACT_OBSERVABLES(caseAfterUpdate.title),
    };
  }

  if (valueToUpdateIsStatus(key, value) && caseHasAlerts && caseBeforeUpdate.settings.syncAlerts) {
    return {
      ...toast,
      text: i18n.STATUS_CHANGED_TOASTER_TEXT,
    };
  }

  return toast;
};

export const constructAssigneesFilter = (
  assignees: FilterOptions['assignees']
): { assignees?: string | string[] } =>
  assignees.length > 0
    ? {
        assignees: assignees?.map((assignee) =>
          assignee === null ? NO_ASSIGNEES_FILTERING_KEYWORD : assignee
        ) ?? [NO_ASSIGNEES_FILTERING_KEYWORD],
      }
    : {};

export const constructReportersFilter = (reporters: User[]) => {
  return reporters.length > 0
    ? {
        reporters: reporters
          .map((reporter) => {
            if (reporter.profile_uid != null) {
              return reporter.profile_uid;
            }

            return reporter.username ?? '';
          })
          .filter((reporterID) => !isEmpty(reporterID)),
      }
    : {};
};

export const constructCustomFieldsFilter = (
  optionKeysByCustomFieldKey: FilterOptions['customFields']
) => {
  if (!optionKeysByCustomFieldKey || Object.keys(optionKeysByCustomFieldKey).length === 0) {
    return {};
  }

  const valuesByCustomFieldKey: {
    [key in string]: Array<CustomFieldFactoryFilterOption['value']>;
  } = {};

  for (const [customFieldKey, customField] of Object.entries(optionKeysByCustomFieldKey)) {
    const { type, options: selectedOptions } = customField;
    if (customFieldsBuilder[type]) {
      const { filterOptions: customFieldFilterOptionsConfig = [] } = customFieldsBuilder[type]();
      const values = selectedOptions
        .map((selectedOption) => {
          const filterOptionConfig = customFieldFilterOptionsConfig.find(
            (filterOption) => filterOption.key === selectedOption
          );
          return filterOptionConfig ? filterOptionConfig.value : undefined;
        })
        .filter((option) => option !== undefined) as Array<CustomFieldFactoryFilterOption['value']>;

      if (values.length > 0) {
        valuesByCustomFieldKey[customFieldKey] = values;
      }
    }
  }

  return Object.keys(valuesByCustomFieldKey).length
    ? {
        customFields: valuesByCustomFieldKey,
      }
    : {};
};

export const getIncrementalIdSearchOverrides = (search: string) => {
  const incrementalIdRegEx = /^#(\d{1,50})\s*$/;
  // overrides for incremental_id search
  let overrides: Partial<FilterOptions> = {};
  let trimmedSearch = search?.trim();
  const isIncrementalIdSearch = incrementalIdRegEx.test(trimmedSearch ?? '');
  if (trimmedSearch && isIncrementalIdSearch) {
    // extract the number portion of the inc id search: #123 -> 123
    trimmedSearch = incrementalIdRegEx.exec(trimmedSearch)?.[1] ?? trimmedSearch;
    // search only in `incremental_id` since types with `title`
    // and `description` don't overlap
    overrides = {
      searchFields: ['incremental_id.text'],
      search: trimmedSearch,
    };
  }
  return overrides;
};
