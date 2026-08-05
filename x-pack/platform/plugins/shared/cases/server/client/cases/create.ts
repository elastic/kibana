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
import type { CreateUserAction, CommonUserActionArgs } from '../../services/user_actions/types';
import { emptyCaseAssigneesSanitizer } from './sanitizers';
import { normalizeCreateCaseRequest } from './utils';
import { mergeCustomFieldsIntoExtendedFields } from '../../../common/utils/template_fields';
import {
  applyTemplateDefaultsToCreateRequest,
  ensureTemplateVersionIsPinned,
  resolveTemplateForCreate,
} from './expand_template_defaults';

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
    let query = emptyCaseAssigneesSanitizer(rawQuery);
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

    // Expand the template's case defaults and extended_fields defaults into the request
    // (caller-wins), and pin the resolved template version. Runs AFTER the createCase
    // authorization so the unsecured template read never becomes an existence oracle for
    // unauthorized callers, and BEFORE extended_fields validation so the merged map is what
    // gets validated.
    let resolvedTemplateFields;
    // Captured when a template is expanded so the activity log can record which template (with its
    // point-in-time name) the case was created from and the initial extended_fields it applied —
    // the create_case user action itself does not carry either field.
    let appliedTemplateName: string | undefined;
    // Resolved lazily and reused: template expansion needs it to decide whether to apply template
    // assignees, and the license-enforcement block below needs it again — resolve at most once.
    let hasPlatinumLicenseOrGreater: boolean | undefined;
    if (!clientArgs.config.templates.enabled) {
      // Without the templates feature there is no expansion to resolve a missing version, and a
      // stored template reference must always be version-pinned (close-time validation relies
      // on it).
      ensureTemplateVersionIsPinned(query.template);
    } else if (query.template?.id) {
      const resolvedTemplate = await resolveTemplateForCreate({
        templateId: query.template.id,
        version: query.template.version,
        owner: query.owner,
        templatesService,
        fieldDefinitionsService,
      });
      appliedTemplateName = resolvedTemplate.parsed.name;

      const callerSentAssignees = query.assignees !== undefined;

      hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();
      query = await applyTemplateDefaultsToCreateRequest(query, resolvedTemplate, {
        hasPlatinumLicenseOrGreater,
        actionsClient: clientArgs.actionsClient,
        logger,
      });

      // The initial decode validated the raw request; template defaults are merged in afterwards
      // and a template's definition tags are unbounded, so re-decode the expanded request to
      // enforce the wire limits (e.g. MAX_TAGS_PER_CASE) on the merged result.
      query = decodeWithExcessOrThrow(CasePostRequestRt)(query);
      resolvedTemplateFields = resolvedTemplate.resolvedFields;

      // The assignees authorization above ran against the raw request; if the template just
      // introduced assignees, the assignCase operation still has to be checked.
      if (!callerSentAssignees && query.assignees && query.assignees.length > 0) {
        await auth.ensureAuthorized({
          operation: Operations.assignCase,
          entities: [{ owner: query.owner, id: savedObjectID }],
        });
      }
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
        preResolvedTemplateFields: resolvedTemplateFields,
      });
    }

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (query.assignees && query.assignees.length !== 0) {
      hasPlatinumLicenseOrGreater =
        hasPlatinumLicenseOrGreater ?? (await licensingService.isAtLeastPlatinum());

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

    // The create_case user action payload does not carry `template` or `extended_fields`
    // (CreateCaseUserActionRt strips them), so a case created from a template would otherwise leave
    // no trace in the activity log of which template it came from or its initial template fields.
    // Emit the dedicated template + extended_fields user actions so the audit trail matches the
    // persisted case. Gated on the flag so it only runs on the template-expansion path: flag-off
    // creation with a caller-pinned template stays byte-for-byte as it was before this PR (no extra
    // activity-log entries), and expansion always stamps a concrete version so the guard holds.
    if (
      clientArgs.config.templates.enabled &&
      query.template?.id &&
      query.template.version !== undefined
    ) {
      const common = { caseId: newCase.id, user, owner: newCase.attributes.owner };
      const templateUserActions: Array<
        CreateUserAction<'template' | 'extended_fields'> & CommonUserActionArgs
      > = [
        {
          ...common,
          type: UserActionTypes.template,
          payload: {
            template: {
              id: query.template.id,
              version: query.template.version,
              ...(appliedTemplateName ? { name: appliedTemplateName } : {}),
            },
          },
        },
      ];

      // Record the initial extended_fields exactly as persisted on the case SO (the template ×
      // caller merge, plus any customFields mirror), so the activity log reflects the stored values.
      const persistedExtendedFields = normalizedCase.extended_fields;
      if (persistedExtendedFields && Object.keys(persistedExtendedFields).length > 0) {
        templateUserActions.push({
          ...common,
          type: UserActionTypes.extended_fields,
          payload: { extended_fields: persistedExtendedFields },
        });
      }

      await userActionService.creator.bulkCreateUserAction({ userActions: templateUserActions });
    }

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
