/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';

/**
 * Builds the plain object that represents one template in export/import YAML.
 *
 * Template identity lives under the `template_*` keys; the case defaults
 * (name/description/tags/severity/category/assignees/connector/settings) sit at the top level, and
 * custom fields under `definition.fields` — mirroring the import schema (see `use_parse_yaml`).
 * Undefined/empty values are omitted so the export stays clean and re-imports losslessly. The object
 * is serialized with the `yaml` library (rather than hand-rolled strings) so values that need
 * escaping — tags containing `#`, `:`, leading `-`, etc. — round-trip correctly.
 */
const toExportObject = (template: ParsedTemplate): Record<string, unknown> => {
  const def = template.definition;
  const out: Record<string, unknown> = {
    templateId: template.templateId,
    template_name: template.name,
    owner: template.owner,
  };

  if (template.author) {
    out.author = template.author;
  }
  if (template.description !== undefined) {
    out.template_description = template.description;
  }
  out.templateVersion = template.templateVersion;
  out.latestVersion = template.latestVersion;
  out.isLatest = template.isLatest;
  out.deletedAt = template.deletedAt ?? null;
  out.fieldCount = template.fieldCount ?? 0;
  out.usageCount = template.usageCount ?? 0;
  out.lastUsedAt = template.lastUsedAt ?? '';
  out.isDefault = template.isDefault ?? false;
  if (template.isEnabled !== undefined) {
    out.isEnabled = template.isEnabled;
  }

  // Case defaults — kept distinct from the template identity above.
  if (def.name) {
    out.name = def.name;
  }
  if (typeof def.description === 'string') {
    out.description = def.description;
  }
  if (def.severity) {
    out.severity = def.severity;
  }
  if (def.category != null) {
    out.category = def.category;
  }
  // Case defaults are forced-present: always write `tags` and `assignees` (empty arrays when unset)
  // so import and export round-trip them identically instead of dropping empty values.
  out.tags = def.tags ?? [];
  out.assignees = def.assignees ?? [];
  if (def.connector) {
    out.connector = def.connector;
  }
  if (def.settings) {
    out.settings = def.settings;
  }
  if (template.tags && template.tags.length > 0) {
    out.template_tags = template.tags;
  }

  out.definition = { fields: def.fields };
  return out;
};

const stringifyTemplate = (template: ParsedTemplate): string =>
  yamlStringify(toExportObject(template), { lineWidth: 0 }).trimEnd();

/**
 * Converts templates (already parsed on the server) into a multi-document YAML string for download.
 * Best-effort reconstruction: it does not preserve the original author's exact formatting/comments,
 * but the data round-trips losslessly through the import parser.
 */
export const templatesToYaml = (templates: ParsedTemplate[]): string => {
  const lines: string[] = [
    `# Bulk Export: ${templates.length} templates`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];
  for (const template of templates) {
    lines.push('---', stringifyTemplate(template));
  }
  return lines.join('\n');
};

export const templateToYaml = (template: ParsedTemplate): string =>
  [
    `# Template: ${template.name}`,
    `# Exported: ${new Date().toISOString()}`,
    '',
    stringifyTemplate(template),
  ].join('\n');
