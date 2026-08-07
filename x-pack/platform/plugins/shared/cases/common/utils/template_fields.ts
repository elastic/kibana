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
import { CustomFieldTypes } from '../types/domain/custom_field/v1';

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

// ---------------------------------------------------------------------------
// customFields → extended_fields adapter utilities
//
// These helpers are used by:
//   1. The one-shot Task Manager backfill
//      (`server/tasks/templates_migration/run_case_backfill.ts`)
//   2. The write-time adapter in the cases client
//      (`server/client/cases/create.ts`, `bulk_create.ts`, `bulk_update.ts`,
//       `replace_custom_field.ts`)
// ---------------------------------------------------------------------------

// Mirrors the persisted SO shape (`CasePersistedCustomFields` in server/common/types/case.ts).
// `type` is intentionally `string` rather than `CustomFieldTypes` so the function is resilient
// to unknown future types (they fall through to the `'keyword'` default in getV2FieldType).
interface LegacyCaseCustomField {
  key: string;
  type: string;
  value: unknown;
}

/**
 * Maps a legacy `customFields` type string to the v2 field-definition `type` string used as the
 * `_as_<type>` suffix in `extended_fields` storage keys.
 *
 * - `'number'` → `'integer'`  (v1 numbers are integer-only; matches the v2 integer field type)
 * - `'toggle'` → `'boolean'`  (matches the native v2 TOGGLE field's `type`)
 * - everything else → `'keyword'`
 *
 * Shared between the one-shot migration and the write-time adapter so that the key each path
 * derives for a given field is always identical.
 */
export const getV2FieldType = (legacyType: string): 'integer' | 'boolean' | 'keyword' => {
  if (legacyType === CustomFieldTypes.NUMBER) return 'integer';
  if (legacyType === CustomFieldTypes.TOGGLE) return 'boolean';
  return 'keyword';
};

/**
 * Computes the `extended_fields` entries to add to a case from its legacy `customFields`.
 *
 * Semantics — **existing wins, nulls skipped**:
 * - A key already present in `existingExtendedFields` is left as-is (a value set through the v2
 *   system takes precedence over the legacy mirror).
 * - A `customFields` entry whose value is `null` or `undefined` is skipped — the case left the
 *   field empty; the v2 field then renders empty rather than being forced to a value.
 *
 * Returns only the *additions* (keys not yet present). Callers are responsible for spreading the
 * result over the existing map; see {@link mergeCustomFieldsIntoExtendedFields} for the combined
 * helper.
 */
export const buildExtendedFieldsBackfill = (
  customFields: LegacyCaseCustomField[] | undefined,
  existingExtendedFields: Record<string, unknown> | null | undefined
): Record<string, string> => {
  const existing = existingExtendedFields ?? {};
  const additions: Record<string, string> = {};

  for (const cf of customFields ?? []) {
    const hasValue = cf.value !== null && cf.value !== undefined;
    if (hasValue) {
      const snakeKey = getFieldSnakeKey(cf.key, getV2FieldType(cf.type));
      if (!(snakeKey in existing)) {
        additions[snakeKey] = String(cf.value);
      }
    }
  }

  return additions;
};

/**
 * Mirrors `customFields` values into an existing `extended_fields` map with
 * **customFields-win** semantics — the live write-time counterpart of {@link buildExtendedFieldsBackfill}.
 *
 * Rules applied for each customField entry:
 * - non-null / non-undefined value → override (or add) the mirror key with `String(value)`.
 * - null / undefined value → delete the mirror key so the v2 field renders empty rather than
 *   retaining a stale value.
 *
 * Returns:
 * - `existingExtendedFields` unchanged (same reference) when every key in the result would be
 *   identical to the current map — callers use reference equality to detect a no-op and skip
 *   the SO write.
 * - a new merged map otherwise.
 *
 * Note: the one-shot migration backfill ({@link buildExtendedFieldsBackfill}) retains
 * existing-wins semantics so it never clobbers values written through the v2 system.
 */
export const mergeCustomFieldsIntoExtendedFields = (
  customFields: LegacyCaseCustomField[] | undefined,
  existingExtendedFields: Record<string, unknown> | null | undefined
): Record<string, string> | null | undefined => {
  const existing = existingExtendedFields ?? {};
  const merged: Record<string, string> = { ...existing } as Record<string, string>;

  for (const cf of customFields ?? []) {
    const snakeKey = getFieldSnakeKey(cf.key, getV2FieldType(cf.type));
    if (cf.value !== null && cf.value !== undefined) {
      merged[snakeKey] = String(cf.value);
    } else {
      delete merged[snakeKey];
    }
  }

  // Return the same reference when the result is value-identical — signals no-op to callers.
  const existingKeys = Object.keys(existing);
  const mergedKeys = Object.keys(merged);
  const isNoOp =
    existingKeys.length === mergedKeys.length &&
    mergedKeys.every((k) => merged[k] === (existing as Record<string, string>)[k]);

  return isNoOp ? (existingExtendedFields as Record<string, string> | null | undefined) : merged;
};
