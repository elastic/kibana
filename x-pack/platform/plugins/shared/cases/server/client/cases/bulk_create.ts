/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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
import type { Owner } from '../../../common/constants/types';
import type {
  BulkCreateCasesRequest,
  BulkCreateCasesResponse,
  CasePostRequest,
} from '../../../common/types/api';
import { BulkCreateCasesResponseRt, BulkCreateCasesRequestRt } from '../../../common/types/api';
import {
  validateCustomFieldsStructure,
  validateRequiredCustomFields,
  resolveGlobalFields,
  validateCaseExtendedFields,
  resolveTemplateFieldsForClose,
} from './validators';
import {
  buildExtendedFieldsDefaults,
  pickExtendedFieldsDifferingFromDefaults,
} from '../../../common/utils/template_fields';
import { applyProfilesToAssignees, getUserProfilesSafe, normalizeCreateCaseRequest } from './utils';
import { ensureTemplateVersionIsPinned } from './expand_template_defaults';
import type { BulkCreateCasesArgs } from '../../services/cases/types';
import type { NotifyAssigneesArgs } from '../../services/notifications/types';
import type { CaseTransformedAttributes } from '../../common/types/case';
import type { InlineField } from '../../../common/types/domain/template/fields';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';
import {
  loadFieldLinkIndexes,
  logUnresolvedMirrorKeys,
  throwIfMalformedFieldLinkage,
} from '../../common/utils/mirror_custom_fields';
import type { ActiveLinkMaps } from '../../common/utils/pair_field_representations';
import {
  buildActiveLinkMaps,
  incrementPairedWriteCounter,
  pairCreatedCaseFields,
  throwIfFieldRepresentationConflicts,
  throwIfInvalidLinkedFieldValues,
} from '../../common/utils/pair_field_representations';
import {
  CREATE_CASE_WITHOUT_TEMPLATE_COUNTER,
  CREATE_CASE_WITH_TEMPLATE_COUNTER,
  incrementCasesClientCounter,
} from '../usage_counters';

/**
 * Internal (non-wire) options for bulkCreate. These are only settable by in-process callers
 * through the cases client — bulkCreate has no HTTP route, so they can never arrive from
 * outside the Kibana server.
 */
export interface BulkCreateCasesClientOptions {
  /**
   * Skip `required` enforcement on extended_fields (value/type/pattern validation still runs
   * on every field that carries a value). For automated writers like the cases connector:
   * "required" is a promise the UI extracts from a human filling a form, and an automated
   * caller has no human to ask — without this, one required no-default field definition in a
   * space silently breaks every automated case creation in it.
   */
  relaxRequiredFields?: boolean;
}

/**
 * Tallies how many of the created cases carry each template, so the usage stats count cases rather
 * than distinct templates while still writing once per template.
 */
const countCasesPerTemplateId = (
  casesSOs: Array<SavedObject<CaseTransformedAttributes>>
): Map<string, number> => {
  const casesPerTemplateId = new Map<string, number>();

  for (const { attributes } of casesSOs) {
    const templateId = attributes.template?.id;

    if (templateId != null) {
      casesPerTemplateId.set(templateId, (casesPerTemplateId.get(templateId) ?? 0) + 1);
    }
  }

  return casesPerTemplateId;
};

export const bulkCreate = async (
  data: BulkCreateCasesRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  options: BulkCreateCasesClientOptions = {}
): Promise<BulkCreateCasesResponse> => {
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

    // Per-owner caches: the request may span owners, but every case of one owner
    // shares the same active-link maps and (isGlobal) field definitions.
    const linkMapsByOwner = new Map<string, ActiveLinkMaps>();
    const globalFieldsByOwner = new Map<string, InlineField[]>();

    for (const theCase of casesWithIds) {
      const customFieldsConfiguration = customFieldsConfigurationMap.get(theCase.owner);

      validateRequest({ theCase, customFieldsConfiguration, hasPlatinumLicenseOrGreater });

      // Pairing for existing links runs independently of the templates feature
      // flag (addendum A1) — any owner with configured customFields pays one
      // bounded definitions fetch.
      let links: ActiveLinkMaps | undefined;
      if (customFieldsConfiguration?.length) {
        links = linkMapsByOwner.get(theCase.owner);
        if (!links) {
          const linkIndexes = await loadFieldLinkIndexes(theCase.owner, fieldDefinitionsService);
          links = buildActiveLinkMaps(customFieldsConfiguration, linkIndexes);
          linkMapsByOwner.set(theCase.owner, links);
        }
      }

      const { request } = await createBulkCreateCaseRequest({
        theCase,
        user,
        customFieldsConfiguration,
        links,
        logger,
        usageCounter: clientArgs.usageCounter,
        templatesService,
        fieldDefinitionsService,
        globalFieldsByOwner,
        templatesEnabled: clientArgs.config.templates.enabled,
        relaxRequiredFields: options.relaxRequiredFields === true,
      });
      bulkCreateRequest.push(request);
    }

    // Server-derived assignee identity, gated by feature flag `assigneeIdentity`
    if (clientArgs.config.assigneeIdentity.enabled) {
      const allUids = new Set(
        bulkCreateRequest.flatMap((theCase) => theCase.assignees?.map(({ uid }) => uid) ?? [])
      );
      const profiles = await getUserProfilesSafe(clientArgs.securityStartPlugin, allUids, logger);

      if (profiles) {
        for (const theCase of bulkCreateRequest) {
          if (theCase.assignees && theCase.assignees.length > 0) {
            theCase.assignees = applyProfilesToAssignees(theCase.assignees, profiles);
          }
        }
      }
    }

    const bulkCreateResponse = await caseService.bulkCreateCases({
      cases: bulkCreateRequest,
      refresh: false,
    });

    const userActions = [];
    const assigneesPerCase: NotifyAssigneesArgs[] = [];
    const res: Case[] = [];

    const errors = bulkCreateResponse.saved_objects.filter(isSOError<CaseTransformedAttributes>);
    const casesSOs = bulkCreateResponse.saved_objects.filter(
      (so): so is SavedObject<CaseTransformedAttributes> => !isSOError(so)
    );

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

    // Resolve names of applied templates so the "applied template" user action records a
    // point-in-time snapshot — a template's name can change across versions, so it must reflect
    // the exact version applied, not the current latest. Deduped by "id@version". Gated on the
    // templates flag, matching create.ts: a caller-pinned template with the flag off leaves no
    // trace here (pre-expansion behavior).
    const templateNamesByKey = new Map<string, string>();
    if (clientArgs.config.templates.enabled) {
      const appliedTemplates = [
        ...new Map(
          casesSOs
            .map((c) => c.attributes.template)
            .filter((t): t is NonNullable<typeof t> => t != null)
            .map((t) => [`${t.id}@${t.version}`, t] as const)
        ).values(),
      ];
      await Promise.all(
        appliedTemplates.map(async ({ id, version }) => {
          const templateSO = await templatesService.getTemplate(id, String(version));
          if (templateSO) {
            templateNamesByKey.set(`${id}@${version}`, templateSO.attributes.name);
          }
        })
      );
    }

    // Reuses the same per-owner cache createBulkCreateCaseRequest populated above.
    const resolveCachedGlobalFieldsForUserActions = async (
      owner: string
    ): Promise<InlineField[]> => {
      let globalFields = globalFieldsByOwner.get(owner);
      if (!globalFields) {
        globalFields = await resolveGlobalFields(owner, fieldDefinitionsService);
        globalFieldsByOwner.set(owner, globalFields);
      }
      return globalFields;
    };

    // Per-template-id cache of resolved defaults: multiple cases in one bulk request commonly
    // share the same (connector-resolved) template, so this avoids re-fetching/re-parsing it.
    const templateFieldDefaultsById = new Map<string, Record<string, string>>();
    const resolveTemplateFieldDefaults = async (template: {
      id: string;
      version: number;
    }): Promise<Record<string, string>> => {
      const cacheKey = `${template.id}@${template.version}`;
      let defaults = templateFieldDefaultsById.get(cacheKey);
      if (!defaults) {
        const resolvedFields = await resolveTemplateFieldsForClose({
          templateId: template.id,
          templateVersion: template.version,
          templatesService,
          fieldDefinitionsService,
          logger,
        });
        defaults = buildExtendedFieldsDefaults(resolvedFields);
        templateFieldDefaultsById.set(cacheKey, defaults);
      }
      return defaults;
    };

    for (const theCase of casesSOs) {
      userActions.push(createBulkCreateUserActionsRequest({ theCase, user }));

      // The create_case user action payload does not carry `template` (CreateCaseUserActionRt
      // strips it), so a dedicated entry is needed for the activity log to reflect which template
      // (if any) the case was created from — mirrors create.ts's single-case equivalent.
      if (clientArgs.config.templates.enabled && theCase.attributes.template != null) {
        const { id: templateId, version: templateVersion } = theCase.attributes.template;
        const templateName = templateNamesByKey.get(`${templateId}@${templateVersion}`);
        userActions.push({
          type: UserActionTypes.template,
          caseId: theCase.id,
          user,
          payload: {
            template: {
              id: templateId,
              version: templateVersion,
              ...(templateName ? { name: templateName } : {}),
            },
          },
          owner: theCase.attributes.owner,
        });
      }

      // Pairing (independent of the templates flag) can populate extended_fields from a linked
      // customFields value, or the caller can supply it directly — either way, create_case's
      // payload strips extended_fields, so without a dedicated entry a non-empty extended_fields
      // on the persisted case has zero record in the activity log.
      //
      // bulkCreate has no server-side template expansion (its only caller, the cases connector,
      // resolves and injects template defaults itself before calling in), so unlike create.ts the
      // persisted map can't be split into "caller-supplied" vs "server-injected default" by
      // construction. Re-resolve the applied template's own defaults here (global defaults win on
      // a storage-key collision, matching create.ts's precedence) purely to filter the activity
      // log — a connector-created case from a template must not read as if every field, including
      // ones the connector filled from the template, was explicitly set.
      const persistedExtendedFields = theCase.attributes.extended_fields;
      if (persistedExtendedFields && Object.keys(persistedExtendedFields).length > 0) {
        const globalFieldsDefaults = buildExtendedFieldsDefaults(
          await resolveCachedGlobalFieldsForUserActions(theCase.attributes.owner)
        );
        const templateFieldDefaults = theCase.attributes.template
          ? await resolveTemplateFieldDefaults(theCase.attributes.template)
          : {};
        const activityDefaultsBaseline = Object.fromEntries(
          Object.keys(templateFieldDefaults).map((key) => [
            key,
            globalFieldsDefaults[key] ?? templateFieldDefaults[key],
          ])
        );
        const activityExtendedFields = pickExtendedFieldsDifferingFromDefaults(
          persistedExtendedFields,
          activityDefaultsBaseline
        );
        if (Object.keys(activityExtendedFields).length > 0) {
          userActions.push({
            type: UserActionTypes.extended_fields,
            caseId: theCase.id,
            user,
            payload: { extended_fields: activityExtendedFields },
            owner: theCase.attributes.owner,
          });
        }
      }

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

    const casesCreatedWithTemplate = casesSOs.filter(
      (c) => c.attributes.template?.id != null
    ).length;

    incrementCasesClientCounter(
      clientArgs,
      CREATE_CASE_WITH_TEMPLATE_COUNTER,
      casesCreatedWithTemplate
    );
    incrementCasesClientCounter(
      clientArgs,
      CREATE_CASE_WITHOUT_TEMPLATE_COUNTER,
      casesSOs.length - casesCreatedWithTemplate
    );

    const casesPerTemplateId = countCasesPerTemplateId(casesSOs);

    await Promise.allSettled(
      [...casesPerTemplateId].map(async ([templateId, caseCount]) => {
        try {
          await templatesService.incrementUsageStats(templateId, caseCount);
        } catch (error) {
          logger.warn(`Failed to update template usage stats for template ${templateId}: ${error}`);
        }
      })
    );

    const createdCasesResponse = decodeOrThrow(BulkCreateCasesResponseRt)({ cases: res });

    createdCasesResponse.cases.forEach((createdCase) => {
      clientArgs.casesEventBus?.emitCaseCreated(clientArgs.request, {
        caseId: createdCase.id,
        owner: createdCase.owner as Owner,
      });
    });

    return createdCasesResponse;
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

  // Structural checks only; required-ness is checked later, after pairing (in
  // createBulkCreateCaseRequest), against the effective post-pair customFields array.
  validateCustomFieldsStructure(customFieldsValidationParams);
  validateAssigneesUsage({ assignees: theCase.assignees, hasPlatinumLicenseOrGreater });

  // bulkCreate has no HTTP route — its callers (the cases connector) resolve templates
  // themselves and always pin a version. Server-side template expansion (which resolves an
  // omitted version to latest) is deliberately limited to `create`: running it here would
  // silently change connector behavior (e.g. template assignees under the rule's request
  // context). Reject an unpinned reference instead of storing one that close-time
  // `required_on_close` validation cannot resolve.
  ensureTemplateVersionIsPinned(theCase.template);
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

const createBulkCreateCaseRequest = async ({
  theCase,
  customFieldsConfiguration,
  user,
  links,
  logger,
  usageCounter,
  templatesService,
  fieldDefinitionsService,
  globalFieldsByOwner,
  templatesEnabled,
  relaxRequiredFields,
}: {
  theCase: { id: string } & BulkCreateCasesRequest['cases'][number];
  customFieldsConfiguration?: CustomFieldsConfiguration;
  user: User;
  /** Preloaded per-owner active-link maps; undefined when the owner has no configured customFields. */
  links?: ActiveLinkMaps;
  logger: CasesClientArgs['logger'];
  usageCounter: CasesClientArgs['usageCounter'];
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
  /** Per-owner (isGlobal) field-definition cache, shared and populated across the whole bulk request. */
  globalFieldsByOwner: Map<string, InlineField[]>;
  templatesEnabled: boolean;
  /** See {@link BulkCreateCasesClientOptions.relaxRequiredFields}. */
  relaxRequiredFields: boolean;
}): Promise<{
  request: BulkCreateCasesArgs['cases'][number];
}> => {
  const { id, ...caseWithoutId } = theCase;

  // Caller intent, captured before pairing/normalization can populate extended_fields from a
  // linked customFields value or a template default — mirrors create.ts's
  // hadExtendedFieldsBeforeDefaults. bulkCreate's only caller (the cases connector) has no way to
  // supply values for fields it doesn't know about, so validating as if it explicitly submitted
  // the final (pairing/default-populated) map would enforce "required" against fields the caller
  // never had a chance to fill in — silently breaking every automated case creation in a space
  // that has any required field the connector doesn't touch (e.g. any required Field Library
  // entry, once that owner has even one legacy custom field that pairing mirrors).
  const hadExtendedFieldsBeforeDefaults = caseWithoutId.extended_fields !== undefined;

  const resolveCachedGlobalFields = async (): Promise<InlineField[]> => {
    let globalFields = globalFieldsByOwner.get(theCase.owner);
    if (!globalFields) {
      globalFields = await resolveGlobalFields(theCase.owner, fieldDefinitionsService);
      globalFieldsByOwner.set(theCase.owner, globalFields);
    }
    return globalFields;
  };

  // NOTE: extended_fields is validated once, below — after pairing resolves any linked field
  // supplied only via customFields into its extended_fields counterpart. Validating here (before
  // pairing) would reject a request pairing would have made valid: e.g. two required linked
  // fields, one supplied via customFields and the other via extended_fields — a pre-pair check
  // only sees the latter and rejects the former as missing.

  /**
   * Trim title, category, description and tags
   * and fill out missing custom fields
   * before saving to ES
   */

  const normalizedCase = normalizeCreateCaseRequest(caseWithoutId, customFieldsConfiguration);

  // Global (isGlobal) field-definition defaults are injected here for the same reason as
  // create.ts: the caller only sends the fields it knows about (the connector sends the
  // template's resolved defaults), which previously left every global field empty on
  // bulk-created cases — even globals that have defaults. Precedence matches create.ts:
  // caller-sent values always win, and only real (non-empty) defaults are injected. Runs
  // BEFORE pairing so a linked global field's injected default can cross into its
  // customFields counterpart, and BEFORE validation so the merged map is what's validated.
  if (templatesEnabled) {
    const globalFields = await resolveCachedGlobalFields();
    const globalFieldsDefaults = Object.fromEntries(
      Object.entries(buildExtendedFieldsDefaults(globalFields)).filter(([, value]) => value !== '')
    );
    if (Object.keys(globalFieldsDefaults).length > 0) {
      normalizedCase.extended_fields = {
        ...globalFieldsDefaults,
        ...(normalizedCase.extended_fields ?? {}),
      };
    }
  }

  // Pair the two representations of every linked field, applying the create
  // default precedence of addendum A2 (explicit caller value on either side —
  // conflicting dual input rejects the whole bulk create with a structured
  // 400 — then the v1 configuration default is copied to v2). bulkCreate has
  // no server-side template expansion, so a template default only exists here
  // as an explicit extended_fields entry pre-resolved by the caller.
  //
  // Caller intent is the RAW request (caseWithoutId.customFields /
  // caseWithoutId.extended_fields), never the post-fill array —
  // fillMissingCustomFields pads absent optional-no-default fields with
  // synthetic nulls that must not be mistaken for explicit input.
  if (links) {
    const paired = pairCreatedCaseFields({
      callerCustomFields: caseWithoutId.customFields,
      callerExtendedFields: caseWithoutId.extended_fields,
      effectiveCustomFields: normalizedCase.customFields ?? [],
      effectiveExtendedFields: normalizedCase.extended_fields,
      links,
    });
    throwIfMalformedFieldLinkage(paired.malformedFields);
    throwIfFieldRepresentationConflicts(paired.conflictFields, usageCounter);
    throwIfInvalidLinkedFieldValues(paired.invalidValues);
    logUnresolvedMirrorKeys(paired.unresolvedKeys, { owner: theCase.owner, logger });
    incrementPairedWriteCounter(
      usageCounter,
      paired,
      paired.extendedFields !== normalizedCase.extended_fields || paired.customFields !== undefined
    );

    normalizedCase.extended_fields = (paired.extendedFields as Record<string, string>) ?? undefined;
    if (paired.customFields !== undefined) {
      // Values were decoded through the per-type codecs, so they satisfy the
      // customFields union even though the adapter is structurally typed.
      normalizedCase.customFields =
        paired.customFields as unknown as typeof normalizedCase.customFields;
    }
  }

  // Single authoritative validation pass over the FINAL, post-pairing representations — mirrors
  // create.ts. Unlike the pairing checks above (which only cover actively-linked fields), this
  // rejects unknown extended_fields keys, wrong-typed values, and missing required fields for
  // every case — including pure v2-native fields with no linked v1 customField.
  //
  // Two callers, two contracts:
  //   API / workflow-step callers (relaxRequiredFields: false): strict when the caller explicitly
  //     sends extended_fields (partial: false → required fields enforced). When they omit
  //     extended_fields entirely, partial: true preserves backward compatibility — callers that
  //     predate required global fields would otherwise 400. Note: close-time required_on_close is
  //     checked separately; PATCH enforces required on the keys it receives.
  //   Connector / alert-driven callers (relaxRequiredFields: true): always partial — the connector
  //     sends whatever defaults it can resolve; "did it send extended_fields" says nothing about
  //     its ability to fill the fields it didn't, and a required miss will be visible on the case.
  validateRequiredCustomFields({
    requestCustomFields: normalizedCase.customFields,
    customFieldsConfiguration,
  });

  if (normalizedCase.extended_fields) {
    const globalFields = await resolveCachedGlobalFields();
    await validateCaseExtendedFields({
      extendedFields: normalizedCase.extended_fields,
      templateId: theCase.template?.id,
      globalFields,
      templatesService,
      fieldDefinitionsService,
      owner: theCase.owner,
      partial: relaxRequiredFields || !hadExtendedFieldsBeforeDefaults,
    });
  }

  return {
    request: {
      id,
      ...transformNewCase({
        user,
        newCase: normalizedCase,
      }),
    },
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
    // Keep the user action uid-only
    assignees: theCase.attributes.assignees?.map(({ uid }) => ({ uid })) ?? [],
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
