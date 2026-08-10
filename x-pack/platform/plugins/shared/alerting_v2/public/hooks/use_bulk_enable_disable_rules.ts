/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, IToasts } from '@kbn/core/public';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi, type BulkResponse } from '../services/rules_api';
import type { BulkSelection } from './use_bulk_select';
import { ruleKeys } from './query_key_factory';

const getHttpFetchErrorMessage = (error: unknown): string | undefined => {
  const httpError = error as IHttpFetchError<{ message?: string }>;
  return httpError.body?.message;
};

const addBulkMutationDangerToast = (
  toasts: Pick<IToasts, 'addDanger'>,
  title: string,
  error: unknown
) => {
  const serverMessage = getHttpFetchErrorMessage(error);
  if (serverMessage) {
    toasts.addDanger({ title, text: serverMessage });
  } else {
    toasts.addDanger(title);
  }
};

/** Dispatches to the by-ID or by-query enable endpoint based on the selection mode. */
const dispatchBulkEnable = (rulesApi: RulesApi, params: BulkSelection): Promise<BulkResponse> => {
  if (params.mode === 'by_ids') {
    return rulesApi.bulkEnableRules({ ids: params.ids });
  }
  const { mode: _mode, ...query } = params;
  return rulesApi.enableRulesByQuery({ ...query, force: true });
};

/** Dispatches to the by-ID or by-query disable endpoint based on the selection mode. */
const dispatchBulkDisable = (rulesApi: RulesApi, params: BulkSelection): Promise<BulkResponse> => {
  if (params.mode === 'by_ids') {
    return rulesApi.bulkDisableRules({ ids: params.ids });
  }
  const { mode: _mode, ...query } = params;
  return rulesApi.disableRulesByQuery({ ...query, force: true });
};

export const useBulkEnableRules = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkSelection) => dispatchBulkEnable(rulesApi, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk enable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.successMessage', {
            defaultMessage:
              '{affectedCount, plural, one {# rule} other {# rules}} enabled successfully',
            values: { affectedCount: data.affected_count },
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: (error) => {
      addBulkMutationDangerToast(
        toasts,
        i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.errorTitle', {
          defaultMessage: 'Failed to enable rules',
        }),
        error
      );
    },
  });
};

export const useBulkDisableRules = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkSelection) => dispatchBulkDisable(rulesApi, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk disable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.successMessage', {
            defaultMessage:
              '{affectedCount, plural, one {# rule} other {# rules}} disabled successfully',
            values: { affectedCount: data.affected_count },
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: (error) => {
      addBulkMutationDangerToast(
        toasts,
        i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.errorTitle', {
          defaultMessage: 'Failed to disable rules',
        }),
        error
      );
    },
  });
};
