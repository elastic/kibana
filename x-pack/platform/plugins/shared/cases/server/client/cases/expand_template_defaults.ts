/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CaseSeverity } from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CasePostRequest } from '../../../common/types/api';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import type { InlineField } from '../../../common/types/domain/template/fields';
import {
  buildExtendedFieldsDefaults,
  resolveTemplateFields,
} from '../../../common/utils/template_fields';
import { parseTemplate } from '../../routes/api/templates/parse_template';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';

/**
 * A template resolved and prepared for expansion into a create-case request.
 */
export interface ResolvedCreateTemplate {
  /** The pinned identity persisted on the case — version is always concrete, even when the request omitted it. */
  template: { id: string; version: number };
  parsed: ParsedTemplate;
  /** Template fields with `$ref` entries resolved against the owner's field library. */
  resolvedFields: InlineField[];
}

/**
 * Resolves the template referenced by a create-case request: fetches the SO (latest version when
 * the request omits one), guards the owner, parses the YAML definition, and resolves `$ref`
 * fields against the owner's field library.
 *
 * The template's default connector is NOT resolved here — that read is deferred to
 * `applyTemplateDefaultsToCreateRequest`, which only performs it when the caller sent a `.none`
 * connector (the sole case where the template default is actually applied), so a caller supplying
 * their own connector never pays for the actions-client round-trip.
 *
 * Reads use the unsecured services deliberately: the caller has already passed the createCase
 * authorization for `owner`, matching the `resolveGlobalFields` rationale — creating a case from
 * a template must not additionally require template-read privileges.
 *
 * Throws Boom.badRequest for unknown / soft-deleted / cross-owner templates (same "not found"
 * wording as `validateCaseExtendedFields`, so a cross-owner id is indistinguishable from a
 * missing one) and for definitions that fail schema validation.
 */
export const resolveTemplateForCreate = async ({
  templateId,
  version,
  owner,
  templatesService,
  fieldDefinitionsService,
}: {
  templateId: string;
  version?: number;
  owner: string;
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
}): Promise<ResolvedCreateTemplate> => {
  const templateSO = await templatesService.getTemplate(
    templateId,
    version !== undefined ? String(version) : undefined,
    { includeDeleted: false }
  );

  // A disabled template is not selectable for new cases, matching the create-from-template UI
  // (which requests `isEnabled: true` only). We treat it exactly like a missing template — same
  // "not found" wording, no existence leak — rather than filtering inside the templates service:
  // required_on_close validation reads whichever version a case already pinned regardless of its
  // enabled state, and must keep working. `isEnabled` is optional and defaults to enabled, so only
  // an explicit `false` disables. (An already-open case that pinned this template is unaffected.)
  if (
    !templateSO ||
    templateSO.attributes.owner !== owner ||
    templateSO.attributes.isEnabled === false
  ) {
    throw Boom.badRequest(`Template ${templateId} not found`);
  }

  let parsed: ParsedTemplate;
  try {
    parsed = parseTemplate(templateSO.attributes);
  } catch (err) {
    throw Boom.badRequest(`Template ${templateId} has an invalid definition`);
  }

  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
  const resolvedFields = resolveTemplateFields(parsed.definition.fields, fieldDefinitions);

  return {
    template: {
      id: templateSO.attributes.templateId,
      version: templateSO.attributes.templateVersion,
    },
    parsed,
    resolvedFields,
  };
};

/**
 * Resolves the template's default connector `name` from its `id` (the YAML stores connectors
 * without a name). Returns undefined when the template has no connector or the id no longer
 * resolves — the case then keeps the caller's connector, mirroring the create form's fallback.
 */
const resolveTemplateConnector = async (
  parsed: ParsedTemplate,
  actionsClient: PublicMethodsOf<ActionsClient>,
  logger: Logger
): Promise<CasePostRequest['connector'] | undefined> => {
  const templateConnector = parsed.definition.connector;
  if (!templateConnector || templateConnector.type === ConnectorTypes.none) {
    return undefined;
  }

  try {
    const action = await actionsClient.get({ id: templateConnector.id });
    return { ...templateConnector, name: action.name } as CasePostRequest['connector'];
  } catch (error) {
    // The connector default is dropped and the case keeps the caller's connector (the UI does the
    // same). A genuinely-missing / unauthorized connector is expected here, but so is a transient
    // ES/auth error — log so a real infra failure silently changing the created case is diagnosable.
    logger.debug(
      `Dropping template connector default "${templateConnector.id}"; could not resolve it: ${error}`
    );
    return undefined;
  }
};

/**
 * Applies a resolved template's case defaults and `extended_fields` defaults onto a create-case
 * request. **Caller-wins**: any value explicitly present in the request survives; template
 * defaults only fill what the caller left unset.
 *
 * Per-field semantics:
 * - `extended_fields`: per-key merge — template defaults for every stored (non display-only)
 *   field, overlaid by the caller's map. A caller-sent empty string wins over a template default.
 * - `severity` / `category` / `assignees`: applied only when the request omits the field entirely
 *   (an explicit `null` category or empty assignees array is a caller decision and wins).
 *   Template assignees are skipped without Platinum — a template default must not brick case
 *   creation on lower license tiers; caller-sent assignees keep today's hard license failure.
 * - `tags`: caller-wins like the other list/scalar defaults — template tags apply only when the
 *   caller sent none (an empty `tags` array is a caller decision and wins). Deduped defensively.
 * - `settings.extractObservables`: filled from the template when the caller omitted it
 *   (`syncAlerts` is required on the wire, so it is always the caller's).
 * - `connector`: the template connector applies only when the caller sent `.none`. Its `name` is
 *   resolved via the actions client here (lazily, behind the `.none` gate); an unresolvable id is
 *   dropped and the caller's `.none` connector is kept, mirroring the create form's fallback.
 * - `title` / `description` / `owner`: required on the wire — caller wins by construction. The
 *   template's `name` (default case title) and `description` are create-form defaults only.
 * - `template`: rewritten to the resolved `{id, version}` so the case and its `create_case` user
 *   action always pin a concrete version, even when the request omitted one.
 */
export const applyTemplateDefaultsToCreateRequest = async <T extends CasePostRequest>(
  query: T,
  resolved: ResolvedCreateTemplate,
  {
    hasPlatinumLicenseOrGreater,
    actionsClient,
    logger,
  }: {
    hasPlatinumLicenseOrGreater: boolean;
    actionsClient: PublicMethodsOf<ActionsClient>;
    logger: Logger;
  }
): Promise<T> => {
  const definition = resolved.parsed.definition;
  const expanded: T = { ...query, template: resolved.template };

  if (query.severity === undefined && definition.severity) {
    expanded.severity = definition.severity as CaseSeverity;
  }

  if (query.category === undefined && definition.category) {
    expanded.category = definition.category;
  }

  if (query.assignees === undefined && hasPlatinumLicenseOrGreater) {
    // A template default must not brick creation on lower license tiers, so template assignees
    // are skipped silently without Platinum (caller-sent assignees keep the hard license error).
    // Empty-uid entries are dropped here because emptyCaseAssigneesSanitizer ran pre-expansion.
    const templateAssignees = (definition.assignees ?? []).filter(({ uid }) => uid.length > 0);
    if (templateAssignees.length > 0) {
      expanded.assignees = templateAssignees;
    }
  }

  if (query.tags.length === 0 && definition.tags !== undefined && definition.tags.length > 0) {
    expanded.tags = [...new Set(definition.tags)];
  }

  if (
    query.settings.extractObservables === undefined &&
    definition.settings?.extractObservables !== undefined
  ) {
    expanded.settings = {
      ...query.settings,
      extractObservables: definition.settings.extractObservables,
    };
  }

  // Resolve the template's default connector only when the caller sent `.none` — the sole case
  // where it can be applied. Deferring the read here (rather than eagerly in resolveTemplateForCreate)
  // spares callers with their own connector an actions-client round-trip and a spurious debug log.
  if (query.connector.type === ConnectorTypes.none) {
    const templateConnector = await resolveTemplateConnector(
      resolved.parsed,
      actionsClient,
      logger
    );
    if (templateConnector !== undefined) {
      expanded.connector = templateConnector;
    }
  }

  const extendedFieldsDefaults = buildExtendedFieldsDefaults(resolved.resolvedFields);
  const mergedExtendedFields = { ...extendedFieldsDefaults, ...(query.extended_fields ?? {}) };
  if (Object.keys(mergedExtendedFields).length > 0) {
    expanded.extended_fields = mergedExtendedFields;
  }

  return expanded;
};

/**
 * Guards the flag-off / non-expanding paths: a template reference persisted on a case must
 * always carry a concrete version (close-time `required_on_close` validation pins to it).
 * The expanding create path never hits this — expansion stamps the resolved version.
 */
export const ensureTemplateVersionIsPinned = (
  template: { id: string; version?: number } | null | undefined
): void => {
  if (template != null && template.version === undefined) {
    throw Boom.badRequest(
      `template.version is required (template ${template.id}). It may only be omitted on case creation when the templates feature is enabled.`
    );
  }
};
