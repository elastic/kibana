/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { partition } from 'lodash';

import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case, CustomFieldsConfiguration, User } from '../../../common/types/domain';
import { CaseSeverity, UserActionTypes } from '../../../common/types/domain';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { Operations } from '../../authorization';
import { createCaseError, isSODecoratedError, isSOError } from '../../common/error';
import { flattenCaseSavedObject, transformNewCase } from '../../common/utils';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type {
  BulkCreateCasesRequest,
  BulkCreateCasesResponse,
  CasePostRequest,
} from '../../../common/types/api';
import { BulkCreateCasesResponseRt, BulkCreateCasesRequestRt } from '../../../common/types/api';
import { validateCustomFields } from './validators';
import { normalizeCreateCaseRequest } from './utils';
import type { BulkCreateCasesArgs } from '../../services/cases/types';
import type { NotifyAssigneesArgs } from '../../services/notifications/types';
import type { CaseTransformedAttributes } from '../../common/types/case';

export const bulkCreate = async (
  data: BulkCreateCasesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkCreateCasesResponse> => {
  const {
    services: { caseService, userActionService, licensingService, notificationService },
    user,
    logger,
    authorization: auth,
  } = clientArgs;

  try {
    const decodedData = decodeWithExcessOrThrow(BulkCreateCasesRequestRt)(data);
    const configurations = await casesClient.configure.get();

    const customFieldsConfigurationMap: Map<string, CustomFieldsConfiguration> = new Map(
      configurations.map((conf) => [conf.owner, conf.customFields])
    );

    const casesWithIds = getCaseWithIds(decodedData);

    if (
      casesWithIds.filter((theCase) => theCase.assignees && theCase.assignees.length !== 0).length >
      0
    ) {
      await auth.ensureAuthorized({
        operation: [Operations.assignCase, Operations.createCase],
        entities: casesWithIds.map((theCase) => ({ owner: theCase.owner, id: theCase.id })),
      });
    } else {
      await auth.ensureAuthorized({
        operation: Operations.createCase,
        entities: casesWithIds.map((theCase) => ({ owner: theCase.owner, id: theCase.id })),
      });
    }

    const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

    const bulkCreateRequest: BulkCreateCasesArgs['cases'] = [];

    for (const theCase of casesWithIds) {
      const customFieldsConfiguration = customFieldsConfigurationMap.get(theCase.owner);

      validateRequest({ theCase, customFieldsConfiguration, hasPlatinumLicenseOrGreater });

      bulkCreateRequest.push(
        createBulkCreateCaseRequest({ theCase, user, customFieldsConfiguration })
      );
    }

    const bulkCreateResponse = await caseService.bulkCreateCases({
      cases: bulkCreateRequest,
      refresh: false,
    });

    const userActions = [];
    const assigneesPerCase: NotifyAssigneesArgs[] = [];
    const res: Case[] = [];

    const [errors, casesSOs] = partition(bulkCreateResponse.saved_objects, isSOError);

    if (errors.length > 0) {
      const firstError = errors[0].error;
      if (isSODecoratedError(firstError)) {
        throw new Boom.Boom(firstError.output.payload.error, {
          statusCode: firstError.output.statusCode,
          message: firstError.output.payload.message,
        });
      }

      throw new Boom.Boom(firstError.error, {
        statusCode: firstError.statusCode,
        message: firstError.message,
      });
    }

    for (const theCase of casesSOs) {
      userActions.push(createBulkCreateUserActionsRequest({ theCase, user }));

      if (theCase.attributes.assignees && theCase.attributes.assignees.length !== 0) {
        const assigneesWithoutCurrentUser = theCase.attributes.assignees.filter(
          (assignee) => assignee.uid !== user.profile_uid
        );

        assigneesPerCase.push({ assignees: assigneesWithoutCurrentUser, theCase });
      }

      res.push(
        flattenCaseSavedObject({
          savedObject: theCase,
        })
      );
    }

    await userActionService.creator.bulkCreateUserAction({ userActions });

    if (assigneesPerCase.length > 0) {
      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
      await notificationService.bulkNotifyAssignees(assigneesPerCase);
    }

    return decodeOrThrow(BulkCreateCasesResponseRt)({ cases: res });
  } catch (error) {
    throw createCaseError({ message: `Failed to bulk create cases: ${error}`, error, logger });
  }
};

const getCaseWithIds = (
  req: BulkCreateCasesRequest
): Array<{ id: string } & BulkCreateCasesRequest['cases'][number]> =>
  req.cases.map((theCase) => ({
    ...theCase,
    id: theCase.id ?? SavedObjectsUtils.generateId(),
  }));

const validateRequest = ({
  theCase,
  customFieldsConfiguration,
  hasPlatinumLicenseOrGreater,
}: {
  theCase: BulkCreateCasesRequest['cases'][number];
  customFieldsConfiguration?: CustomFieldsConfiguration;
  hasPlatinumLicenseOrGreater: boolean;
}) => {
  const customFieldsValidationParams = {
    requestCustomFields: theCase.customFields,
    customFieldsConfiguration,
  };

  validateCustomFields(customFieldsValidationParams);
  validateAssigneesUsage({ assignees: theCase.assignees, hasPlatinumLicenseOrGreater });
};

const validateAssigneesUsage = ({
  assignees,
  hasPlatinumLicenseOrGreater,
}: {
  assignees?: BulkCreateCasesRequest['cases'][number]['assignees'];
  hasPlatinumLicenseOrGreater: boolean;
}) => {
  /**
   * Assign users to a case is only available to Platinum+
   */

  if (assignees && assignees.length !== 0) {
    if (!hasPlatinumLicenseOrGreater) {
      throw Boom.forbidden(
        'In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
      );
    }
  }
};

const createBulkCreateCaseRequest = ({
  theCase,
  customFieldsConfiguration,
  user,
}: {
  theCase: { id: string } & BulkCreateCasesRequest['cases'][number];
  customFieldsConfiguration?: CustomFieldsConfiguration;
  user: User;
}): BulkCreateCasesArgs['cases'][number] => {
  const { id, ...caseWithoutId } = theCase;

  /**
   * Trim title, category, description and tags
   * and fill out missing custom fields
   * before saving to ES
   */

  const normalizedCase = normalizeCreateCaseRequest(caseWithoutId, customFieldsConfiguration);

  return {
    id,
    ...transformNewCase({
      user,
      newCase: normalizedCase,
    }),
  };
};

const createBulkCreateUserActionsRequest = ({
  theCase,
  user,
}: {
  theCase: SavedObject<CaseTransformedAttributes>;
  user: User;
}) => {
  const userActionPayload: CasePostRequest = {
    title: theCase.attributes.title,
    tags: theCase.attributes.tags,
    connector: theCase.attributes.connector,
    settings: theCase.attributes.settings,
    owner: theCase.attributes.owner,
    description: theCase.attributes.description,
    severity: theCase.attributes.severity ?? CaseSeverity.LOW,
    assignees: theCase.attributes.assignees ?? [],
    category: theCase.attributes.category ?? null,
    customFields: theCase.attributes.customFields ?? [],
  };

  return {
    type: UserActionTypes.create_case,
    caseId: theCase.id,
    user,
    payload: userActionPayload,
    owner: theCase.attributes.owner,
  };
};
