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
  resolveTemplateFields,
} from '../../../common/utils';
import type { TemplatesService } from '../../services/templates';
import type { FieldDefinitionsService } from '../../services/field_definitions';
import { parseTemplate } from '../../routes/api/templates/parse_template';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { resolveGlobalFields } from './validators';

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
  const globalFields = await resolveGlobalFields(owner, fieldDefinitionsService);

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

    const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
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

export interface GetApplicableFieldsParams {
  /** Required for pre-create discovery. Ignored when `caseId` is provided (owner is read off the case). */
  owner?: string;
  /** Optional template to scope discovery to. Ignored when `caseId` is provided. */
  templateId?: string;
  /** When provided, owner + applied template are derived from the case. */
  caseId?: string;
}

/**
 * Returns the fully-formed `extended_fields` a caller may apply, either for a prospective case
 * (`owner` [+ optional `templateId`]) or for an existing case (`caseId`). Authorization is enforced
 * here because `resolveGlobalFields` uses the unsecured SO client.
 */
export const getApplicableFields = async (
  params: GetApplicableFieldsParams,
  clientArgs: CasesClientArgs
): Promise<ApplicableFieldsResponse> => {
  const {
    services: { caseService, templatesService, fieldDefinitionsService },
    logger,
    authorization,
  } = clientArgs;

  try {
    let owner: string;
    let templateId: string | null | undefined = params.templateId;

    if (params.caseId) {
      const theCase = await caseService.getCase({ id: params.caseId });
      await authorization.ensureAuthorized({
        operation: Operations.getCase,
        entities: [{ owner: theCase.attributes.owner, id: theCase.id }],
      });
      owner = theCase.attributes.owner;
      templateId = theCase.attributes.template?.id;
    } else {
      if (!params.owner) {
        throw Boom.badRequest('owner is required');
      }
      owner = params.owner;
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
  } catch (error) {
    throw createCaseError({
      message: `Failed to get applicable fields: ${error}`,
      error,
      logger,
    });
  }
};
