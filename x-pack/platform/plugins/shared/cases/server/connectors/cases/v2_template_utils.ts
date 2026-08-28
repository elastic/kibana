/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { Logger } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import {
  buildExtendedFieldsDefaults,
  parseFieldDefinitionsToInlineFields,
  resolveTemplateFields,
} from '../../../common/utils/template_fields';
import type { FieldDefinitionsFindRequest } from '../../../common/types/api/field_definition/v1';
import { buildFieldLinkIndexes } from '../../common/utils/field_link_resolution';
import { buildActiveLinkMaps } from '../../common/utils/pair_field_representations';
import type { CasesClient } from '../../client';

export type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

/**
 * Parse a raw YAML definition string into a validated ParsedTemplateDefinition.
 * Returns null if the YAML is invalid or fails schema validation.
 */
export const parseTemplateDefinition = (
  definitionYaml: string
): ParsedTemplateDefinition | null => {
  try {
    const raw = parseYaml(definitionYaml);
    const result = ParsedTemplateDefinitionSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

/**
 * Fetch a v2 template by id + version, validate owner, and parse its definition.
 * Returns the ParsedTemplateDefinition, or null when the template cannot be found,
 * belongs to a different owner, or has an invalid definition (logs a warning in each case).
 */
export const resolveV2Template = async (
  casesClient: CasesClient,
  templateId: string,
  templateVersion: string,
  owner: string,
  logger: Logger
): Promise<ParsedTemplateDefinition | null> => {
  const so = await casesClient.templates.getTemplate(templateId, templateVersion, {
    includeDeleted: false,
  });

  if (!so) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template with id "${templateId}" version "${templateVersion}" not found or has been deleted. Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  if (so.attributes.owner !== owner) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template "${templateId}" belongs to owner "${so.attributes.owner}" but the connector is running for owner "${owner}". Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  const definition = parseTemplateDefinition(so.attributes.definition);
  if (!definition) {
    logger.warn(
      `[CasesConnector][resolveV2Template] Template "${templateId}" has an invalid definition. Falling back to default case fields.`,
      { tags: ['case-connector:resolveV2Template'] }
    );
    return null;
  }

  return definition;
};

export interface ResolvedV2Template {
  definition: ParsedTemplateDefinition;
  templateId: string;
  templateVersion: number;
}

/**
 * Resolves the migrated v2 template for a rule that still stores a legacy (v1) template `key`.
 *
 * v1 identified templates by `key` (their `name` was not unique), so the migration records the
 * originating key on each migrated template as `legacyKey`. We match on that first, which uniquely
 * and correctly disambiguates v1 templates that shared a name.
 *
 * For environments migrated before `legacyKey` was recorded, we fall back to matching by name
 * (case-insensitive and trimmed, mirroring the template-name uniqueness rule). Returns null when
 * nothing matches (e.g. the migration has not run) so the caller can fall back to the legacy path.
 */
export const resolveV2TemplateForLegacyKey = async (
  casesClient: CasesClient,
  legacyKey: string,
  legacyName: string | undefined,
  owner: string,
  logger: Logger
): Promise<ResolvedV2Template | null> => {
  const { templates } = await casesClient.templates.getAllTemplates({
    page: 1,
    perPage: 10000,
    sortField: 'name',
    sortOrder: 'asc',
    search: '',
    tags: [],
    author: [],
    owner: [owner],
    isDeleted: false,
    isEnabled: true,
  });

  const ownerTemplates = templates.filter((template) => template.owner === owner);

  // Prefer the exact v1 lineage recorded by the migration.
  let matched = ownerTemplates.find((template) => template.legacyKey === legacyKey);

  // Fallback for pre-`legacyKey` migrations: match by normalized name.
  if (!matched && legacyName) {
    const normalizedName = legacyName.trim().toLocaleLowerCase();
    matched = ownerTemplates.find(
      (template) => template.name.trim().toLocaleLowerCase() === normalizedName
    );
  }

  if (!matched) {
    logger.warn(
      `[CasesConnector][resolveV2TemplateForLegacyKey] No migrated v2 template found for legacy template key "${legacyKey}" (owner "${owner}"). Falling back to the legacy template path.`,
      { tags: ['case-connector:resolveV2TemplateForLegacyKey'] }
    );
    return null;
  }

  const definition = parseTemplateDefinition(matched.definition);
  if (!definition) {
    logger.warn(
      `[CasesConnector][resolveV2TemplateForLegacyKey] Migrated v2 template "${matched.templateId}" (legacy key "${legacyKey}") has an invalid definition. Falling back to the legacy template path.`,
      { tags: ['case-connector:resolveV2TemplateForLegacyKey'] }
    );
    return null;
  }

  return {
    definition,
    templateId: matched.templateId,
    templateVersion: matched.templateVersion,
  };
};

export interface ExtendedFieldsFromTemplate {
  /** Resolved template + global defaults, keyed by storage key. */
  extendedFields: Record<string, string>;
  /**
   * Legacy (v1) custom-field keys whose linked definition received a value in
   * `extendedFields`. The connector must not ALSO generate a raw v1 value for these keys:
   * legacy configuration defaults and Field Library defaults can legitimately diverge, and
   * sending both raw representations makes pairing reject the whole bulk request as an
   * explicit dual-input conflict. With only the v2 value sent, pairing derives the v1 side.
   */
  legacyKeysWithV2Values: ReadonlySet<string>;
}

/**
 * Fetches the owner's field-definition library and resolves all template fields
 * (both inline and `$ref` entries) into a flat `extended_fields` map of defaults,
 * merged with the owner's global (isGlobal) field defaults — the global definition
 * wins on a storage-key collision, matching the injection precedence in create.ts.
 *
 * Fields with no default are omitted entirely rather than sent as `''`: the connector
 * has no user to fill them in, an empty entry can't satisfy a `required` check anyway,
 * and on the reopen path an explicit `''` would overwrite values users typed into the
 * previously created cases' fields.
 *
 * `customFieldsConfiguration` (the owner's legacy custom fields) is resolved through the
 * standard link-resolution utilities to report which legacy keys already have a v2 value —
 * see {@link ExtendedFieldsFromTemplate.legacyKeysWithV2Values}. Malformed or ambiguous
 * links produce no active link and are therefore never reported, preserving their
 * fail-closed behavior downstream.
 *
 * Called once per connector run on the v2 template path, before case creation.
 */
export const buildExtendedFieldsFromTemplate = async (
  casesClient: CasesClient,
  definition: ParsedTemplateDefinition,
  owner: string,
  customFieldsConfiguration?: CustomFieldsConfiguration
): Promise<ExtendedFieldsFromTemplate> => {
  // The owner is already validated against the template SO; cast to the narrow owner type
  // expected by the sub-client's FieldDefinitionsFindRequest.
  const { fieldDefinitions } = await casesClient.fieldDefinitions.getFieldDefinitions({
    owner: owner as FieldDefinitionsFindRequest['owner'],
  });
  const resolved = resolveTemplateFields(definition.fields ?? [], fieldDefinitions);
  const templateDefaults = buildExtendedFieldsDefaults(resolved);

  // Filter empty global defaults BEFORE merging (mirroring create.ts): a global definition
  // with no default must not clobber a real default the template set for the same storage key
  // (e.g. a `$ref` to the global field with a `metadata.default` override).
  const globalDefaults = Object.fromEntries(
    Object.entries(
      buildExtendedFieldsDefaults(
        parseFieldDefinitionsToInlineFields(fieldDefinitions.filter((fd) => fd.isGlobal === true))
      )
    ).filter(([, value]) => value !== '')
  );

  const extendedFields = Object.fromEntries(
    Object.entries({ ...templateDefaults, ...globalDefaults }).filter(([, value]) => value !== '')
  );

  // Resolve the active v1 links with the same utilities the write path uses, then report every
  // legacy key whose linked storage key carries a generated value.
  const activeLinks = buildActiveLinkMaps(
    customFieldsConfiguration ?? [],
    buildFieldLinkIndexes(fieldDefinitions)
  );
  const legacyKeysWithV2Values = new Set<string>();
  for (const storageKey of Object.keys(extendedFields)) {
    const link = activeLinks.byStorageKey.get(storageKey);
    if (link !== undefined) {
      legacyKeysWithV2Values.add(link.key);
    }
  }

  return { extendedFields, legacyKeysWithV2Values };
};
