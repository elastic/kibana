/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump as yamlDump } from 'js-yaml';
import type { z } from '@kbn/zod/v4';
import { FieldType, type FieldSchema } from '../../../../common/types/domain/template/fields';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';

type Field = z.infer<typeof FieldSchema>;

const yamlString = (value: string | number | undefined | null) => {
  if (value == null) {
    return '""';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value);
};

const indentYaml = (yamlStr: string, spaces: number): string => {
  const prefix = ' '.repeat(spaces);
  return yamlStr
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => prefix + line)
    .join('\n');
};

const serializeTemplateHeader = (out: string[], template: ParsedTemplate) => {
  out.push(`templateId: ${yamlString(template.templateId)}`);
  out.push(`name: ${yamlString(template.name)}`);
  out.push(`owner: ${yamlString(template.owner)}`);

  if (template.author) {
    out.push(`author: ${yamlString(template.author)}`);
  }

  out.push(`description: ${yamlString(template.description ?? '')}`);
  out.push(`templateVersion: ${template.templateVersion}`);
  out.push(`latestVersion: ${template.latestVersion}`);
  out.push(`isLatest: ${template.isLatest}`);
  out.push(`deletedAt: ${template.deletedAt == null ? 'null' : yamlString(template.deletedAt)}`);
  out.push(`fieldCount: ${template.fieldCount ?? 0}`);
  out.push(`usageCount: ${template.usageCount ?? 0}`);
  out.push(`lastUsedAt: ${template.lastUsedAt ? yamlString(template.lastUsedAt) : '""'}`);
  out.push(`isDefault: ${template.isDefault ?? false}`);

  if (template.isEnabled !== undefined) {
    out.push(`isEnabled: ${template.isEnabled}`);
  }

  // severity and category live inside the parsed definition
  if (template.definition.severity) {
    out.push(`severity: ${template.definition.severity}`);
  }
  if (template.definition.category != null) {
    out.push(`category: ${yamlString(template.definition.category)}`);
  }

  out.push('tags:');
  for (const tag of template.tags ?? []) {
    out.push(`  - ${yamlString(tag)}`);
  }
};

const serializeFieldMetadata = (out: string[], field: Field) => {
  if (field.control === FieldType.SELECT_BASIC) {
    out.push(`      metadata:`);
    out.push(`        options:`);
    for (const option of field.metadata.options) {
      out.push(`          - ${yamlString(option)}`);
    }
    const defaultValue = field.metadata?.default;
    if (
      defaultValue !== undefined &&
      (typeof defaultValue === 'string' || typeof defaultValue === 'number')
    ) {
      out.push(`        default: ${yamlString(defaultValue)}`);
    }
    return;
  }

  if (field.control === FieldType.DATE_PICKER) {
    const meta = field.metadata;
    if (!meta) return;
    // `default` is in the catchall bucket, typed as unknown
    const defaultValue = meta.default;
    const hasDefault =
      typeof defaultValue === 'string' ||
      typeof defaultValue === 'number' ||
      defaultValue instanceof Date;
    if (!hasDefault && meta.show_time === undefined && meta.timezone === undefined) return;
    out.push(`      metadata:`);
    if (hasDefault) {
      const serialized =
        defaultValue instanceof Date
          ? defaultValue.toISOString()
          : (defaultValue as string | number);
      out.push(`        default: ${yamlString(serialized)}`);
    }
    if (meta.show_time !== undefined) {
      out.push(`        show_time: ${meta.show_time}`);
    }
    if (meta.timezone !== undefined) {
      out.push(`        timezone: ${meta.timezone}`);
    }
    return;
  }

  // INPUT_TEXT, INPUT_NUMBER, TEXTAREA
  const defaultValue = field.metadata?.default;
  if (
    defaultValue !== undefined &&
    (typeof defaultValue === 'string' || typeof defaultValue === 'number')
  ) {
    out.push(`      metadata:`);
    out.push(`        default: ${yamlString(defaultValue)}`);
  }
};

const serializeFieldDisplay = (out: string[], field: Field) => {
  if (!field.display?.show_when) return;
  out.push(`      display:`);
  out.push(
    indentYaml(
      yamlDump({ show_when: field.display.show_when }, { indent: 2, lineWidth: -1, noRefs: true }),
      8
    )
  );
};

const serializeFieldValidation = (out: string[], field: Field) => {
  if (!field.validation) return;
  const v = field.validation;
  const filteredValidation: Record<string, unknown> = {};
  if (v.required !== undefined) filteredValidation.required = v.required;
  if (v.required_when !== undefined) filteredValidation.required_when = v.required_when;
  if (v.pattern !== undefined) filteredValidation.pattern = v.pattern;
  if (v.min !== undefined) filteredValidation.min = v.min;
  if (v.max !== undefined) filteredValidation.max = v.max;
  if (v.min_length !== undefined) filteredValidation.min_length = v.min_length;
  if (v.max_length !== undefined) filteredValidation.max_length = v.max_length;

  if (Object.keys(filteredValidation).length === 0) return;
  out.push(`      validation:`);
  out.push(indentYaml(yamlDump(filteredValidation, { indent: 2, lineWidth: -1, noRefs: true }), 8));
};

const serializeField = (out: string[], field: Field) => {
  out.push(`    - name: ${yamlString(field.name)}`);
  if (field.label) {
    out.push(`      label: ${yamlString(field.label)}`);
  }
  out.push(`      control: ${yamlString(field.control)}`);
  out.push(`      type: ${yamlString(field.type)}`);
  serializeFieldMetadata(out, field);
  serializeFieldDisplay(out, field);
  serializeFieldValidation(out, field);
  out.push('');
};

const serializeTemplate = (out: string[], template: ParsedTemplate) => {
  serializeTemplateHeader(out, template);
  out.push('definition:');
  out.push('  fields:');
  for (const field of template.definition.fields) {
    serializeField(out, field);
  }
};

/**
 * Converts templates (already parsed on the server) into a YAML string suitable for download.
 *
 * NOTE: This is a best-effort YAML reconstruction. It does not guarantee a lossless round-trip
 * of the original author-provided YAML formatting.
 */
export const templatesToYaml = (templates: ParsedTemplate[]): string => {
  const out: string[] = [
    `# Bulk Export: ${templates.length} templates`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];

  for (const template of templates) {
    out.push('---');
    serializeTemplate(out, template);
  }

  return out.join('\n');
};

export const templateToYaml = (template: ParsedTemplate): string => {
  const out: string[] = [
    `# Template: ${template.name}`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];
  serializeTemplate(out, template);
  return out.join('\n');
};
