/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case } from '../../../common/types/domain';
import { CaseSeverity, UserActionTypes, CaseRt } from '../../../common/types/domain';
import { decodeWithExcessOrThrow, decodeOrThrow } from '../../common/runtime_types';

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { flattenCaseSavedObject, transformNewCase } from '../../common/utils';
import type { CasesClient, CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type { CasePostRequest } from '../../../common/types/api';
import { CasePostRequestRt } from '../../../common/types/api';
import {
  validateCustomFields,
  resolveGlobalFields,
  validateCaseExtendedFields,
} from './validators';
import { emptyCaseAssigneesSanitizer } from './sanitizers';
import { normalizeCreateCaseRequest } from './utils';
import { mergeCustomFieldsIntoExtendedFields } from '../../../common/utils/template_fields';

/**
 * Creates a new case.
 *
 */
export const create = async (
  data: CasePostRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const {
    services: {
      caseService,
      userActionService,
      licensingService,
      notificationService,
      templatesService,
      fieldDefinitionsService,
    },
    user,
    logger,
    authorization: auth,
  } = clientArgs;

  try {
    const rawQuery = decodeWithExcessOrThrow(CasePostRequestRt)(data);
    const query = emptyCaseAssigneesSanitizer(rawQuery);
    const configurations = await casesClient.configure.get({ owner: data.owner });
    const customFieldsConfiguration = configurations[0]?.customFields;

    const customFieldsValidationParams = {
      requestCustomFields: data.customFields,
      customFieldsConfiguration,
    };

    validateCustomFields(customFieldsValidationParams);

    const savedObjectID = SavedObjectsUtils.generateId();
    if (query.assignees && query.assignees.length > 0) {
      await auth.ensureAuthorized({
        operation: [Operations.assignCase, Operations.createCase],
        entities: [{ owner: query.owner, id: savedObjectID }],
      });
    } else {
      await auth.ensureAuthorized({
        operation: Operations.createCase,
        entities: [{ owner: query.owner, id: savedObjectID }],
      });
    }

    if (query.extended_fields) {
      const globalFields = await resolveGlobalFields(query.owner, fieldDefinitionsService);
      await validateCaseExtendedFields({
        extendedFields: query.extended_fields,
        templateId: query.template?.id,
        globalFields,
        templatesService,
        fieldDefinitionsService,
        owner: query.owner,
      });
    }

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (query.assignees && query.assignees.length !== 0) {
      const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

      if (!hasPlatinumLicenseOrGreater) {
        throw Boom.forbidden(
          'In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
        );
      }

      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
    }

    /**
     * Trim title, category, description and tags
     * and fill out missing custom fields
     * before saving to ES
     */

    const normalizedCase = normalizeCreateCaseRequest(query, customFieldsConfiguration);

    // Mirror customFields into extended_fields so that automations writing to the legacy API
    // keep the v2 analytics / UI surface populated. CustomFields-win semantics: the incoming
    // value overrides any pre-set mirror key (e.g. a template default in the request).
    //
    // Pass the RAW request customFields (query.customFields), not the post-fill array
    // (normalizedCase.customFields). fillMissingCustomFields pads absent optional-no-default
    // fields with { key, value: null }; those synthetic nulls would otherwise hit the merge's
    // delete branch and wipe mirror keys the request never intended to clear.
    if (clientArgs.config.templates.enabled) {
      normalizedCase.extended_fields =
        mergeCustomFieldsIntoExtendedFields(query.customFields, normalizedCase.extended_fields) ??
        undefined; // return type includes null when input is null; CasePostRequest.extended_fields is never null
    }

    const newCase = await caseService.createCase({
      attributes: transformNewCase({
        user,
        newCase: normalizedCase,
      }),
      id: savedObjectID,
      refresh: false,
    });

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.create_case,
        caseId: newCase.id,
        user,
        payload: {
          ...query,
          severity: query.severity ?? CaseSeverity.LOW,
          assignees: query.assignees ?? [],
          category: query.category ?? null,
          customFields: query.customFields ?? [],
        },
        owner: newCase.attributes.owner,
      },
    });

    if (query.assignees && query.assignees.length !== 0) {
      const assigneesWithoutCurrentUser = query.assignees.filter(
        (assignee) => assignee.uid !== user.profile_uid
      );

      await notificationService.notifyAssignees({
        assignees: assigneesWithoutCurrentUser,
        theCase: newCase,
      });
    }

    if (query.template?.id) {
      try {
        await templatesService.incrementUsageStats(query.template.id);
      } catch (error) {
        logger.warn(
          `Failed to update template usage stats for template ${query.template.id}: ${error}`
        );
      }
    }

    const res = flattenCaseSavedObject({
      savedObject: newCase,
    });

    const createdCase = decodeOrThrow(CaseRt)(res);

    clientArgs.casesEventBus?.emitCaseCreated(clientArgs.request, {
      caseId: createdCase.id,
      owner: createdCase.owner as Owner,
    });

    return createdCase;
  } catch (error) {
    throw createCaseError({ message: `Failed to create case: ${error}`, error, logger });
  }
};
