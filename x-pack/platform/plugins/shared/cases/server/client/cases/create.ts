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
  validateCustomFieldsStructure,
  validateRequiredCustomFields,
  resolveGlobalFieldsWithoutStaleMirrorRequired,
  validateCaseExtendedFields,
  validateRequiredGlobalFields,
} from './validators';
import type { CreateUserAction, CommonUserActionArgs } from '../../services/user_actions/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { emptyCaseAssigneesSanitizer } from './sanitizers';
import { normalizeCreateCaseRequest, populateAssigneesIdentity } from './utils';
import {
  buildExtendedFieldsDefaults,
  pickExtendedFieldsDifferingFromDefaults,
} from '../../../common/utils/template_fields';
import {
  loadFieldLinkIndexes,
  logUnresolvedMirrorKeys,
  throwIfMalformedFieldLinkage,
} from '../../common/utils/mirror_custom_fields';
import {
  buildActiveLinkMaps,
  incrementPairedWriteCounter,
  pairCreatedCaseFields,
  throwIfFieldRepresentationConflicts,
  throwIfInvalidLinkedFieldValues,
} from '../../common/utils/pair_field_representations';
import {
  applyTemplateDefaultsToCreateRequest,
  ensureTemplateVersionIsPinned,
  resolveTemplateForCreate,
} from './expand_template_defaults';
import {
  CREATE_CASE_WITHOUT_TEMPLATE_COUNTER,
  CREATE_CASE_WITH_TEMPLATE_COUNTER,
  incrementCasesClientCounter,
} from '../usage_counters';

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

    // Structural checks only (duplicates, unknown keys, wrong types); required-ness is checked
    // later, after pairing resolves any linked field supplied only via extended_fields.
    validateCustomFieldsStructure(customFieldsValidationParams);

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
    // point-in-time name) the case was created from. Field values that differ from defaults are
    // audited separately; the create_case user action itself does not carry template or fields.
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

    // Global (isGlobal) field-definition defaults are applied client-side by the create-case UI
    // before submission, so UI-created cases persist them — but API and workflow-step callers
    // only send the fields they know about, which left every global field empty on non-UI cases.
    // Merge the defaults here with the same precedence the UI create form produces: template
    // defaults, then global defaults (the global definition is authoritative on a storage-key
    // collision — see resolveApplicableFields), then caller-sent values (caller always wins).
    // Runs AFTER template expansion so the collision order holds, and BEFORE extended_fields
    // validation so the merged map is what gets validated.
    //
    // Captured before injection: when the map exists only because defaults were injected, the
    // final validation below (after pairing) must run with partial (update) semantics. Full
    // create-time validation enforces `required` on absent fields, and enforcing it here would
    // 400 requests that succeeded before defaults injection existed — e.g. every legacy
    // customFields-only create in a space whose required v1 custom fields are mirrored into
    // required global definitions. This must reflect the caller's original direct intent, not
    // whether pairing later populated extended_fields from a linked customFields value —
    // otherwise every legacy customFields-only create would flip to non-partial once pairing
    // exists, defeating the point of this flag.
    const hadExtendedFieldsBeforeDefaults = query.extended_fields !== undefined;
    let globalFields: InlineField[] | undefined;
    const resolveGlobals = (owner: string) =>
      resolveGlobalFieldsWithoutStaleMirrorRequired(
        owner,
        fieldDefinitionsService,
        customFieldsConfiguration
      );
    // Hoisted for create-time Activity filtering: compare persisted fields against the same
    // template ∪ global default baseline used for injection (global wins on key collision).
    let globalFieldsDefaults: Record<string, string> = {};
    if (clientArgs.config.templates.enabled) {
      globalFields = await resolveGlobals(query.owner);
      globalFieldsDefaults = Object.fromEntries(
        // A field without a default produces '' — writing that adds no information and, for a
        // required field, would immediately fail its own validation. Only inject real defaults.
        Object.entries(buildExtendedFieldsDefaults(globalFields)).filter(
          ([, value]) => value !== ''
        )
      );
      if (Object.keys(globalFieldsDefaults).length > 0) {
        query = {
          ...query,
          extended_fields: {
            ...(query.extended_fields ?? {}),
            ...globalFieldsDefaults,
            // The caller's original extended_fields, NOT query.extended_fields — template
            // expansion already merged template defaults into the latter, and those must not
            // shadow a global default on a storage-key collision.
            ...(rawQuery.extended_fields ?? {}),
          },
        };
      }
    }

    // NOTE: extended_fields is validated once, below — after pairing resolves any linked field
    // supplied only via customFields into its extended_fields counterpart. Validating here (before
    // pairing) would reject a request pairing would have made valid (see addendum / pair-before-
    // validate fix): e.g. two required linked fields, one supplied via customFields and the other
    // via extended_fields — a pre-pair check only sees the latter and rejects the former as missing.

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

    // Pair the two representations of every linked field for the create, applying
    // the default precedence of addendum A2: explicit caller value (either
    // representation, conflicting dual input rejects with a structured 400) →
    // template v2 default (copied to v1) → v1 configuration default (copied to
    // v2). Values cross representations through the reversible per-type codecs —
    // never String(value).
    //
    // Caller intent comes from the RAW request (rawQuery.customFields /
    // rawQuery.extended_fields, captured before template expansion and before
    // fillMissingCustomFields pads synthetic nulls); effective values are the
    // post-fill array and the post-template-merge map. Pairing for existing
    // links runs independently of the templates feature flag (addendum A1).
    if (customFieldsConfiguration?.length) {
      const linkIndexes = await loadFieldLinkIndexes(query.owner, fieldDefinitionsService);
      const links = buildActiveLinkMaps(customFieldsConfiguration, linkIndexes);
      const paired = pairCreatedCaseFields({
        callerCustomFields: rawQuery.customFields,
        callerExtendedFields: rawQuery.extended_fields,
        effectiveCustomFields: normalizedCase.customFields ?? [],
        effectiveExtendedFields: normalizedCase.extended_fields,
        links,
      });
      throwIfMalformedFieldLinkage(paired.malformedFields);
      throwIfFieldRepresentationConflicts(paired.conflictFields, clientArgs.usageCounter);
      throwIfInvalidLinkedFieldValues(paired.invalidValues);
      logUnresolvedMirrorKeys(paired.unresolvedKeys, { owner: query.owner, logger });
      incrementPairedWriteCounter(
        clientArgs.usageCounter,
        paired,
        paired.extendedFields !== normalizedCase.extended_fields ||
          paired.customFields !== undefined
      );

      // Return type includes null when input is null; CasePostRequest.extended_fields is never null.
      normalizedCase.extended_fields =
        (paired.extendedFields as Record<string, string>) ?? undefined;
      if (paired.customFields !== undefined) {
        // Values were decoded through the per-type codecs, so they satisfy the
        // customFields union even though the adapter is structurally typed.
        normalizedCase.customFields =
          paired.customFields as unknown as typeof normalizedCase.customFields;
      }
    }

    // Single authoritative validation pass over the FINAL, post-pairing representations — pairing
    // above may have populated either side from the other, so validating any earlier snapshot
    // risks rejecting a request pairing would have made valid (see addendum / pair-before-validate
    // fix). `partial` still reflects the caller's original direct intent (see comment above), not
    // whether pairing populated extended_fields from a linked customFields value.
    validateRequiredCustomFields({
      requestCustomFields: normalizedCase.customFields,
      customFieldsConfiguration,
    });

    if (normalizedCase.extended_fields) {
      globalFields = globalFields ?? (await resolveGlobals(query.owner));
      await validateCaseExtendedFields({
        extendedFields: normalizedCase.extended_fields,
        templateId: query.template?.id,
        globalFields,
        templatesService,
        fieldDefinitionsService,
        owner: query.owner,
        partial: !hadExtendedFieldsBeforeDefaults,
        preResolvedTemplateFields: resolvedTemplateFields,
      });
    }

    // v1-parity `required` enforcement: a required global field with no default and no value
    // fails the create with a 400, exactly like a required v1 custom field does through
    // validateRequiredCustomFields. Runs AFTER defaults injection and pairing so the map is
    // the one that will be persisted — a linked customFields value (or a v1 configuration
    // defaultValue pairing copied across) satisfies the global field. Must run even when
    // extended_fields is absent: that is the no-value path this check exists to reject.
    if (clientArgs.config.templates.enabled) {
      globalFields = globalFields ?? (await resolveGlobals(query.owner));
      validateRequiredGlobalFields({
        globalFields,
        extendedFields: normalizedCase.extended_fields ?? {},
      });
    }

    const attributes = transformNewCase({
      user,
      newCase: normalizedCase,
    });

    // Server-derived assignee identity: resolve profile uids to username /
    // full_name / email so downstream consumers (e.g. cases-as-data analytics)
    // can read human-readable assignees. Gated by feature flag `assigneeIdentity`.
    if (clientArgs.config.assigneeIdentity.enabled) {
      attributes.assignees =
        (await populateAssigneesIdentity(
          clientArgs.securityStartPlugin,
          logger,
          attributes.assignees
        )) ?? [];
    }

    const newCase = await caseService.createCase({
      attributes,
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
          // The persisted value, not the raw request: pairing above (line ~248) can populate
          // customFields from a caller who only sent extended_fields, and the activity log must
          // reflect what was actually written to the case, not what the caller happened to send.
          customFields: normalizedCase.customFields ?? [],
        },
        owner: newCase.attributes.owner,
      },
    });

    // The create_case user action payload does not carry `template` or `extended_fields`
    // (CreateCaseUserActionRt strips them), so dedicated entries are needed for the activity log
    // to reflect what was actually persisted: which template (if any) the case came from, and
    // which extended_fields values differ from resolved defaults. Pairing and default injection
    // both run independently of the templates flag (addendum A1), so this must too — a plain
    // create with no template can still populate extended_fields (from a linked customFields
    // value, or a direct caller-supplied extended_fields) and must not go unrecorded.
    const common = { caseId: newCase.id, user, owner: newCase.attributes.owner };
    const extraUserActions: Array<
      CreateUserAction<'template' | 'extended_fields'> & CommonUserActionArgs
    > = [];

    // Template lineage: only when a template was actually applied (flag-off or a caller-pinned
    // template with no expansion leaves no trace here, matching pre-expansion behavior).
    if (
      clientArgs.config.templates.enabled &&
      query.template?.id &&
      query.template.version !== undefined
    ) {
      extraUserActions.push({
        ...common,
        type: UserActionTypes.template,
        payload: {
          template: {
            id: query.template.id,
            version: query.template.version,
            ...(appliedTemplateName ? { name: appliedTemplateName } : {}),
          },
        },
      });
    }

    // Activity records only values that differ from resolved defaults — not the full persisted
    // map (which still stamps empty/default keys on the case SO). The baseline is the resolved
    // template defaults, with any storage-key collision against a global field resolved to the
    // global default — mirroring the same collision precedence used for injection above (global
    // wins). A global field with no such collision (not also exposed by the template) is NOT
    // part of this baseline: a global default is injected independently of any template and must
    // always show up in the activity log, since that is the only server-side trace that it was
    // written at all. When no template was resolved (flag off, or no template applied), the
    // baseline is empty, so every persisted value — including plain global defaults — is
    // recorded, matching pre-filtering behavior.
    const persistedExtendedFields = normalizedCase.extended_fields ?? {};
    const resolvedTemplateFieldDefaults = buildExtendedFieldsDefaults(resolvedTemplateFields ?? []);
    const activityDefaultsBaseline = Object.fromEntries(
      Object.keys(resolvedTemplateFieldDefaults).map((key) => [
        key,
        globalFieldsDefaults[key] ?? resolvedTemplateFieldDefaults[key],
      ])
    );
    const activityExtendedFields = pickExtendedFieldsDifferingFromDefaults(
      persistedExtendedFields,
      activityDefaultsBaseline
    );
    if (Object.keys(activityExtendedFields).length > 0) {
      extraUserActions.push({
        ...common,
        type: UserActionTypes.extended_fields,
        payload: { extended_fields: activityExtendedFields },
      });
    }

    if (extraUserActions.length > 0) {
      await userActionService.creator.bulkCreateUserAction({ userActions: extraUserActions });
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

    // Bucketed on what was persisted, not on the request, so this reads the same way as the bulk
    // path and stays true if template pinning ever stops mirroring the request one-for-one.
    const persistedTemplateId = newCase.attributes.template?.id;

    incrementCasesClientCounter(
      clientArgs,
      persistedTemplateId ? CREATE_CASE_WITH_TEMPLATE_COUNTER : CREATE_CASE_WITHOUT_TEMPLATE_COUNTER
    );

    if (persistedTemplateId) {
      try {
        await templatesService.incrementUsageStats(persistedTemplateId);
      } catch (error) {
        logger.warn(
          `Failed to update template usage stats for template ${persistedTemplateId}: ${error}`
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
