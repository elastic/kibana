/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  ApplicableField,
  ApplicableFieldSource,
  ApplicableFieldsResponse,
} from '../../../common/types/domain/template/applicable_field';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../common/types/domain/template/fields';
import {
  getFieldSnakeKey,
  getYamlDefaultAsString,
  parseFieldDefinitionsToInlineFields,
  resolveTemplateFields,
} from '../../../common/utils';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';
import { parseTemplate } from '../../routes/api/templates/parse_template';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';

interface TaggedField {
  field: InlineField;
  source: ApplicableFieldSource;
}

/**
 * Maps a resolved inline field to its fully-formed, ready-to-apply `ApplicableField` shape.
 * Display-only fields (e.g. `MARKDOWN`) are kept and flagged `displayOnly` — they are returned so
 * clients can render the full form shape, but their `key` is not writable to `extended_fields`.
 */
export const toApplicableField = (
  field: InlineField,
  source: ApplicableFieldSource
): ApplicableField => {
  const options = (field.metadata as { options?: string[] } | undefined)?.options;
  const rawDefault = (field.metadata as { default?: unknown } | undefined)?.default;

  return {
    key: getFieldSnakeKey(field.name, field.type),
    name: field.name,
    label: field.label ?? field.name,
    type: field.type,
    control: field.control,
    required: field.validation?.required === true,
    requiredOnClose: field.validation?.required_on_close === true,
    displayOnly: isDisplayOnlyField(field),
    ...(options !== undefined ? { options } : {}),
    ...(rawDefault !== undefined ? { defaultValue: getYamlDefaultAsString(rawDefault) } : {}),
    source,
    isGlobal: source === 'global',
  };
};

/**
 * Resolves the fields a caller may write to a case's `extended_fields`, mirroring the write-time
 * validation split in `validateCaseExtendedFields`:
 * - the owner's global (`isGlobal`) field-library definitions, plus
 * - when `templateId` is provided, that template's resolved fields.
 *
 * Global fields take precedence on a storage-key collision (a value under a shared key is validated
 * against the global definition at write time, so it is the authoritative source here too).
 */
export const resolveApplicableFields = async ({
  owner,
  templateId,
  templatesService,
  fieldDefinitionsService,
}: {
  owner: string;
  templateId?: string | null;
  templatesService: TemplatesService;
  fieldDefinitionsService: FieldDefinitionsService;
}): Promise<TaggedField[]> => {
  // Fetched once, unfiltered: template `$ref` resolution needs the full set anyway, and
  // `isGlobal` filtering happens client-side in the service — a second, `isGlobal`-filtered
  // call would just repeat the identical SO `find`.
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
  const globalFields = parseFieldDefinitionsToInlineFields(
    fieldDefinitions.filter((fd) => fd.isGlobal)
  );

  const byKey = new Map<string, TaggedField>();
  for (const field of globalFields) {
    byKey.set(getFieldSnakeKey(field.name, field.type), { field, source: 'global' });
  }

  if (templateId) {
    const templateSO = await templatesService.getTemplate(templateId, undefined, {
      includeDeleted: true,
    });
    // `templatesService` is unsecured — `owner` here is already authorized (either the
    // caller-supplied owner for pre-create discovery, or the case's owner for existing-case
    // discovery), so reject a template belonging to a different owner rather than leaking its
    // field structure across owners.
    if (!templateSO || templateSO.attributes.owner !== owner) {
      throw Boom.badRequest(`Template ${templateId} not found`);
    }

    let parsedTemplate;
    try {
      parsedTemplate = parseTemplate(templateSO.attributes);
    } catch (err) {
      throw Boom.badRequest(`Template ${templateId} has an invalid definition`);
    }

    const templateFields = resolveTemplateFields(
      parsedTemplate.definition.fields,
      fieldDefinitions
    );

    for (const field of templateFields) {
      const key = getFieldSnakeKey(field.name, field.type);
      if (!byKey.has(key)) {
        byKey.set(key, { field, source: 'template' });
      }
    }
  }

  return Array.from(byKey.values());
};

/** Pre-create discovery: owner is required, template is optional. */
interface OwnerScopedParams {
  owner: string;
  templateId?: string;
}

/** Existing-case discovery: owner + applied template are derived from the case. */
interface CaseScopedParams {
  caseId: string;
}

/**
 * Either `owner` (+ optional `templateId`) for a prospective case, or `caseId` for an existing
 * one — never both, so the invalid combination is unrepresentable at the type level (no runtime
 * "owner is required" guard needed).
 */
export type GetApplicableFieldsParams = OwnerScopedParams | CaseScopedParams;

/**
 * Returns the fully-formed `extended_fields` a caller may apply, either for a prospective case
 * (`owner` [+ optional `templateId`]) or for an existing case (`caseId`). Authorization is enforced
 * here because `resolveApplicableFields` uses the unsecured SO/field-definitions clients.
 */
export const getApplicableFields = async (
  params: GetApplicableFieldsParams,
  clientArgs: CasesClientArgs
): Promise<ApplicableFieldsResponse> => {
  const {
    services: { caseService, templatesService, fieldDefinitionsService },
    authorization,
  } = clientArgs;

  let owner: string;
  let templateId: string | null | undefined;

  if ('caseId' in params) {
    const theCase = await caseService.getCase({ id: params.caseId });
    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [{ owner: theCase.attributes.owner, id: theCase.id }],
    });
    owner = theCase.attributes.owner;
    templateId = theCase.attributes.template?.id;
  } else {
    owner = params.owner;
    templateId = params.templateId;
    await authorization.ensureAuthorized({
      operation: Operations.getFieldDefinitions,
      entities: [{ owner, id: owner }],
    });
  }

  const resolved = await resolveApplicableFields({
    owner,
    templateId,
    templatesService,
    fieldDefinitionsService,
  });

  return { fields: resolved.map(({ field, source }) => toApplicableField(field, source)) };
};
