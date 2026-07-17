/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';
import { parse as parseYaml } from 'yaml';
import {
  FieldSchema,
  isDisplayOnlyField,
  isInlineField,
  isRefField,
} from '../types/domain/template/fields';
import type { Field, InlineField, RefField } from '../types/domain/template/fields';
import type { FieldDefinition } from '../types/domain/field_definition/latest';

export const getFieldSnakeKey = (name: string, type: string): string => `${name}_as_${type}`;

export const getFieldCamelKey = (name: string, type: string): string =>
  camelCase(getFieldSnakeKey(name, type));

/**
 * Parses an array of field definitions into resolved inline fields, skipping any
 * definitions that are malformed or describe reference (non-inline) fields.
 */
export const parseFieldDefinitionsToInlineFields = (defs: FieldDefinition[]): InlineField[] => {
  const fields: InlineField[] = [];
  for (const fd of defs) {
    try {
      const parsed = parseYaml(fd.definition);
      const result = FieldSchema.safeParse(parsed);
      if (result.success && isInlineField(result.data)) {
        fields.push(result.data as InlineField);
      }
    } catch {
      // Ignore malformed definitions
    }
  }
  return fields;
};

/**
 * Coerces a YAML-parsed default value to a string for use in `extended_fields`.
 * Single source of truth; re-exported from `public/components/templates_v2/utils`.
 */
export const getYamlDefaultAsString = (rawDefault: unknown): string => {
  if (rawDefault === undefined || rawDefault === null) {
    return '';
  }
  if (typeof rawDefault === 'string') {
    return rawDefault;
  }
  if (typeof rawDefault === 'number') {
    return String(rawDefault);
  }
  if (typeof rawDefault === 'boolean') {
    return String(rawDefault);
  }
  if (rawDefault instanceof Date) {
    return rawDefault.toISOString();
  }
  if (Array.isArray(rawDefault)) {
    return JSON.stringify(rawDefault);
  }
  return '';
};

/**
 * Applies a `$ref` entry's overrides onto its resolved library (inline) field:
 * - `name` acts as a local alias replacing the library field's name.
 * - `metadata.default` overrides the library default. Three cases:
 *     - absent (`undefined`): inherit the library field's default,
 *     - explicit `null`: clear the inherited default so the field stays empty (this is what the
 *       v1→v2 migration emits for a legacy template field whose value was explicitly cleared),
 *     - any other value: use it as the field's default.
 *
 * Shared by `resolveTemplateFields` (server / case-creation) and `useResolvedFields` (editor) so
 * both paths resolve `$ref` overrides identically.
 */
export const applyRefFieldOverride = (
  inlineField: InlineField,
  refField: RefField
): InlineField => {
  let resolved: InlineField =
    refField.name && refField.name !== inlineField.name
      ? { ...inlineField, name: refField.name }
      : inlineField;

  const overrideDefault = refField.metadata?.default;
  if (overrideDefault === null) {
    const { default: _omitted, ...restMetadata } = (resolved.metadata ?? {}) as Record<
      string,
      unknown
    >;
    resolved = { ...resolved, metadata: restMetadata } as InlineField;
  } else if (overrideDefault !== undefined) {
    resolved = {
      ...resolved,
      metadata: { ...(resolved.metadata ?? {}), default: overrideDefault },
    } as InlineField;
  }

  return resolved;
};

/**
 * Resolves a template `fields` array into a flat list of inline fields by:
 * - passing inline fields through as-is,
 * - looking up `$ref` fields by name in `libraryDefs`, parsing their YAML definition,
 *   and applying the ref entry's `name` alias and `metadata.default` override (see
 *   {@link applyRefFieldOverride}).
 *
 * Fields that cannot be resolved or that produce another ref are silently dropped.
 */
export const resolveTemplateFields = (
  definitionFields: readonly Field[],
  libraryDefs: readonly FieldDefinition[]
): InlineField[] =>
  definitionFields.flatMap((field): InlineField[] => {
    if (isInlineField(field)) return [field];
    const refField = field as RefField;
    const fd = libraryDefs.find((d) => d.name === refField.$ref);
    if (!fd) return [];
    try {
      const parsed = parseYaml(fd.definition);
      const result = FieldSchema.safeParse(parsed);
      if (!result.success || isRefField(result.data)) return [];
      return [applyRefFieldOverride(result.data as InlineField, refField)];
    } catch {
      return [];
    }
  });

/**
 * Builds an `extended_fields` map (flat `Record<string, string>`) from a list of
 * resolved inline fields by coercing each field's `metadata.default` to a string.
 */
export const buildExtendedFieldsDefaults = (
  resolvedFields: readonly InlineField[]
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of resolvedFields) {
    // Display-only fields (e.g. MARKDOWN) hold no value and are never stored on a case.
    if (!isDisplayOnlyField(field)) {
      out[getFieldSnakeKey(field.name, field.type)] = getYamlDefaultAsString(
        field.metadata?.default
      );
    }
  }
  return out;
};
