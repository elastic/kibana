/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as stringifyYaml } from 'yaml';
import type { Logger } from '@kbn/core/server';
import type { CaseCustomField } from '../../../common/types/domain/custom_field/v1';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import type { CaseConnector } from '../../../common/types/domain/connector/v1';
import { ConnectorTypes } from '../../../common/types/domain/connector/v1';
import type { CaseAssignees } from '../../../common/types/domain_zod/user/v1';

interface LegacyCaseFields {
  title?: string;
  description?: string;
  severity?: string;
  tags?: string[];
  category?: string | null;
  assignees?: CaseAssignees;
  customFields?: CaseCustomField[];
  connector?: CaseConnector;
  settings?: { syncAlerts: boolean; extractObservables?: boolean };
}

interface LegacyTemplate {
  key: string;
  name: string;
  description?: string;
  tags?: string[];
  caseFields?: LegacyCaseFields | null;
}

/**
 * Builds a YAML string for a ParsedTemplateDefinitionSchema from a legacy template configuration.
 * Custom fields are represented as $ref entries pointing at field-definition names.
 * Any custom field key not found in `refNamesByKey` is omitted with a warning.
 */
export const buildTemplateYaml = (
  legacy: LegacyTemplate,
  refNamesByKey: Map<string, string>,
  logger?: Logger
): string => {
  const { name, caseFields } = legacy;
  const templateDef: Record<string, unknown> = {};

  const caseTitle = caseFields?.title ?? name;
  if (caseTitle) {
    templateDef.name = caseTitle;
  }
  if (caseFields?.description) {
    templateDef.description = caseFields.description;
  }
  if (caseFields?.tags?.length) {
    templateDef.tags = caseFields.tags;
  }
  if (caseFields?.severity) {
    templateDef.severity = caseFields.severity;
  }
  if (caseFields?.category !== undefined) {
    templateDef.category = caseFields.category;
  }
  if (caseFields?.assignees !== undefined) {
    templateDef.assignees = caseFields.assignees;
  }

  // Carry the default connector across, dropping the redundant `name` (resolved from `id`) and the
  // `.none` connector (the implicit default) to keep the YAML clean.
  if (caseFields?.connector && caseFields.connector.type !== ConnectorTypes.none) {
    const { id, type, fields: connectorFields } = caseFields.connector;
    templateDef.connector = { type, id, fields: connectorFields };
  }

  if (caseFields?.settings) {
    templateDef.settings = caseFields.settings;
  }

  const fields: Array<Record<string, unknown>> = (caseFields?.customFields ?? []).flatMap((cf) => {
    const refName = refNamesByKey.get(cf.key);
    if (!refName) {
      logger?.warn(
        `buildTemplateYaml: skipping custom field key "${cf.key}" for template "${name}" — no matching field definition`
      );
      return [];
    }

    const refEntry: Record<string, unknown> = { $ref: refName };

    if (cf.type === CustomFieldTypes.TEXT || cf.type === CustomFieldTypes.NUMBER) {
      // A legacy template stores an explicitly-cleared field as `value: null`. In v1 that meant the
      // field was empty for cases created from the template (the global default was NOT re-applied).
      // In v2 an omitted `$ref` override inherits the field-library default, so to preserve the v1
      // intent we emit an explicit `default: null` — "clear, do not inherit the library default".
      refEntry.metadata = { default: cf.value ?? null };
    } else if (cf.type === CustomFieldTypes.TOGGLE) {
      // Legacy toggles are always a concrete boolean, never null — carry the value straight across.
      if (cf.value !== null && cf.value !== undefined) {
        refEntry.metadata = { default: Boolean(cf.value) };
      }
    }

    return [refEntry];
  });

  templateDef.fields = fields;

  return stringifyYaml(templateDef, { lineWidth: 0 });
};
