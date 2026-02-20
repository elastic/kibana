/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';

const yamlString = (value: string | undefined | null) =>
  value == null ? '""' : JSON.stringify(value);

const serializeTemplate = (yamlSections: string[], template: ParsedTemplate) => {
  yamlSections.push(`templateId: ${yamlString(template.templateId)}`);
  yamlSections.push(`name: ${yamlString(template.name)}`);
  yamlSections.push(`owner: ${yamlString(template.owner)}`);

  if (template.author) {
    yamlSections.push(`author: ${yamlString(template.author)}`);
  }

  yamlSections.push(`description: ${yamlString(template.description ?? '')}`);
  yamlSections.push(`templateVersion: ${template.templateVersion}`);
  yamlSections.push(`latestVersion: ${template.latestVersion}`);
  yamlSections.push(`isLatest: ${template.isLatest}`);
  yamlSections.push(
    `deletedAt: ${template.deletedAt == null ? 'null' : yamlString(template.deletedAt)}`
  );
  yamlSections.push(`fieldCount: ${template.fieldCount ?? 0}`);
  yamlSections.push(`usageCount: ${template.usageCount ?? 0}`);
  yamlSections.push(`lastUsedAt: ${template.lastUsedAt ? yamlString(template.lastUsedAt) : '""'}`);
  yamlSections.push(`isDefault: ${template.isDefault ?? false}`);

  yamlSections.push('tags:');
  for (const tag of template.tags ?? []) {
    yamlSections.push(`  - ${yamlString(tag)}`);
  }

  yamlSections.push('definition:');
  yamlSections.push('  fields:');
  for (const field of template.definition.fields) {
    yamlSections.push(`    - name: ${yamlString(field.name)}`);
    if (field.label) {
      yamlSections.push(`      label: ${yamlString(field.label)}`);
    }
    yamlSections.push(`      control: ${yamlString(field.control)}`);
    yamlSections.push(`      type: ${yamlString(field.type)}`);

    if (field.control === 'SELECT_BASIC') {
      yamlSections.push(`      metadata:`);
      yamlSections.push(`        options:`);
      for (const option of field.metadata.options) {
        yamlSections.push(`          - ${yamlString(option)}`);
      }
      if (field.metadata.default) {
        yamlSections.push(`        default: ${yamlString(field.metadata.default)}`);
      }
    }

    yamlSections.push('');
  }
};

/**
 * Converts templates (already parsed on the server) into a YAML string suitable for download.
 *
 * NOTE: This is a best-effort YAML reconstruction. It does not guarantee a lossless round-trip
 * of the original author-provided YAML formatting.
 */
export const templatesToYaml = (templates: ParsedTemplate[]): string => {
  const yamlSections: string[] = [
    `# Bulk Export: ${templates.length} templates`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];

  for (const template of templates) {
    yamlSections.push('---');
    serializeTemplate(yamlSections, template);
  }

  return yamlSections.join('\n');
};

export const templateToYaml = (template: ParsedTemplate): string => {
  const yamlSections: string[] = [
    `# Template: ${template.name}`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];
  serializeTemplate(yamlSections, template);
  return yamlSections.join('\n');
};
