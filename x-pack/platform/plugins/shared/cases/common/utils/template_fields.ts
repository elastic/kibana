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
import type { Field, InlineField, RefField, Validation } from '../types/domain/template/fields';
import type { FieldDefinition } from '../types/domain/field_definition/latest';
import { CustomFieldTypes } from '../types/domain/custom_field/v1';
import { SAFE_SNAKE_KEY, AUTHORABLE_SNAKE_KEY, MAX_SNAKE_KEY_LENGTH } from '../constants';

export const getFieldSnakeKey = (name: string, type: string): string => `${name}_as_${type}`;

/**
 * Returns true if `key` is safe to interpolate into a Painless string literal (read / storage
 * path). Uses the lenient charset — hyphens and other index-legacy characters are allowed.
 */
export const isSafeExtendedFieldKey = (key: string): boolean =>
  key.length > 0 && key.length <= MAX_SNAKE_KEY_LENGTH && SAFE_SNAKE_KEY.test(key);

/**
 * Why an authoring-time key check failed: `'charset'` — a character outside
 * `AUTHORABLE_SNAKE_KEY`; `'length'` — the derived key exceeds `MAX_SNAKE_KEY_LENGTH`.
 * Distinguished so error messages can tell the author what to actually fix — a 300-character
 * clean snake_case name satisfies the charset rule and would be misled by a charset message.
 */
export type AuthorableKeyViolation = 'charset' | 'length';

/**
 * Checks `key` against the **authoring** rules (strict charset + max length) and returns the
 * first violation, or `null` when the key is authorable. Charset is reported before length:
 * fixing the charset can change the author's intended name, so it's the more actionable error.
 */
export const getAuthorableKeyViolation = (key: string): AuthorableKeyViolation | null => {
  if (key.length === 0 || !AUTHORABLE_SNAKE_KEY.test(key)) return 'charset';
  if (key.length > MAX_SNAKE_KEY_LENGTH) return 'length';
  return null;
};

/**
 * Returns true if `key` satisfies the **authoring** charset (strict subset of
 * `isSafeExtendedFieldKey` — no hyphens). Use this when validating a new field name at write
 * time; use `isSafeExtendedFieldKey` when reading back keys that may predate the strict rule.
 */
export const isAuthorableExtendedFieldKey = (key: string): boolean =>
  getAuthorableKeyViolation(key) === null;

/**
 * Derives the storage key for `(name, type)` and returns the first authoring violation, or
 * `null` when the name is authorable — see {@link getAuthorableKeyViolation}. This is the
 * canonical way to validate a field name before writing it: derive first, check once, rather
 * than maintaining a separate per-name rule.
 */
export const getAuthorableFieldNameViolation = (
  name: string,
  type: string
): AuthorableKeyViolation | null => getAuthorableKeyViolation(getFieldSnakeKey(name, type));

/** Boolean convenience over {@link getAuthorableFieldNameViolation}. */
export const isAuthorableExtendedFieldName = (name: string, type: string): boolean =>
  getAuthorableFieldNameViolation(name, type) === null;

/**
 * Normalizes a field definition name for case-insensitive lookup and uniqueness.
 *
 * Matches the field-definitions API, which compares names with `toLowerCase()` — not
 * `toLocaleLowerCase()`, which `ensureUniqueTemplateName` uses for template titles.
 * `trim()` is stricter than the API uniqueness check. Callers use the result to skip
 * duplicate work or to gate deletes of in-use definitions, never to reject a
 * create/update write.
 */
export const normalizeFieldDefinitionName = (name: string): string => name.trim().toLowerCase();

export const getFieldCamelKey = (name: string, type: string): string =>
  camelCase(getFieldSnakeKey(name, type));

/**
 * Folds a field name the same way {@link getFieldCamelKey} folds the full storage key —
 * lodash `camelCase`, under which `my-field`, `my_field`, and `myField` are all `myField`.
 * Two names with equal folds and equal types collide on the UI's camel read key, silently
 * showing each other's values; write-time validation uses this to reject such twins.
 */
export const getFoldedFieldName = (name: string): string => camelCase(name);

/**
 * Collects the normalized (case-insensitive) `$ref` names from a template's fields array.
 *
 * Used to exclude a global field from the global-fields section when the active template
 * already renders it via `$ref` — normalized so a ref differing only in case from the field
 * definition's name (e.g. after a case-only rename) still excludes it, matching the
 * case-insensitive resolution in {@link resolveTemplateFields} / `useResolvedFields`.
 */
export const collectNormalizedRefNames = (
  fields: readonly Field[] | undefined
): ReadonlySet<string> =>
  (fields ?? []).reduce((refNames, field) => {
    if (isRefField(field)) refNames.add(normalizeFieldDefinitionName(field.$ref));
    return refNames;
  }, new Set<string>());

/**
 * Filters out the `$ref` entries of a template's fields array that target one of
 * `excludedDefinitionNames` (normalized — see {@link normalizeFieldDefinitionName}).
 *
 * Used by the create form when a field definition's linked legacy custom field is itself
 * rendered as an input: the `$ref` to that definition must not produce a second control or a
 * second submitted value for the same logical field. Only `$ref` entries are dropped by
 * definition identity — inline template fields are template-local and pass through even when
 * their names coincide with an excluded definition.
 */
export const excludeRefFieldsToDefinitions = (
  fields: readonly Field[] | undefined,
  excludedDefinitionNames: ReadonlySet<string>
): Field[] =>
  (fields ?? []).filter(
    (field) =>
      !isRefField(field) || !excludedDefinitionNames.has(normalizeFieldDefinitionName(field.$ref))
  );

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
 * The requirement-related `Validation` keys. These are mutually exclusive ways of expressing
 * "when is this field required" — a field is meant to be driven by exactly one of them at a
 * time. See {@link mergeValidationOverride} for how a `$ref` override interacts with them.
 */
const REQUIRED_FAMILY_KEYS = ['required', 'required_when', 'required_on_close'] as const;

/**
 * Shallow-merges a `$ref` entry's local `validation` onto the library field's own `validation`:
 * every ordinary key (`pattern`, `min`, `max`, `min_length`, `max_length`) from the library
 * survives unless the override explicitly redeclares it, so a template that only wants to
 * change requiredness doesn't silently lose the library's format constraints.
 *
 * The requirement keys (`required` / `required_when` / `required_on_close`) are treated as one
 * family rather than merged individually: if the override declares *any* of them, all three are
 * taken from the override alone (the library's own requirement keys are dropped), because a
 * naive per-key merge could otherwise leave e.g. the library's `required: true` sitting next to
 * a template's `required_when`, with both then applying at once. In other words, whichever
 * required* key was defined last (the override, when it defines one) wins outright over the
 * whole family.
 */
export const mergeValidationOverride = (
  libraryValidation: Validation | undefined,
  refValidation: Validation | undefined
): Validation | undefined => {
  if (!refValidation) return libraryValidation;
  if (!libraryValidation) return refValidation;

  const overridesRequiredFamily = REQUIRED_FAMILY_KEYS.some(
    (key) => refValidation[key] !== undefined
  );

  const base = overridesRequiredFamily
    ? Object.fromEntries(
        Object.entries(libraryValidation).filter(
          ([key]) => !(REQUIRED_FAMILY_KEYS as readonly string[]).includes(key)
        )
      )
    : libraryValidation;

  return { ...base, ...refValidation };
};

/**
 * Applies a `$ref` entry's overrides onto its resolved library (inline) field:
 * - `name` acts as a local alias replacing the library field's name.
 * - `metadata.default` overrides the library default. Three cases:
 *     - absent (`undefined`): inherit the library field's default,
 *     - explicit `null`: clear the inherited default so the field stays empty (this is what the
 *       v1→v2 migration emits for a legacy template field whose value was explicitly cleared),
 *     - any other value: use it as the field's default.
 * - `display`, when present on the `$ref` entry, fully replaces the library field's own
 *   `display` (its only key is `show_when`, so there is nothing to preserve from the library).
 * - `validation`, when present on the `$ref` entry, is merged onto the library field's own
 *   `validation` — see {@link mergeValidationOverride} for the requirement-family exception.
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

  if (refField.display !== undefined) {
    resolved = { ...resolved, display: refField.display } as InlineField;
  }

  if (refField.validation !== undefined) {
    resolved = {
      ...resolved,
      validation: mergeValidationOverride(resolved.validation, refField.validation),
    } as InlineField;
  }

  return resolved;
};

/**
 * Resolves a template `fields` array into a flat list of inline fields by:
 * - passing inline fields through as-is,
 * - looking up `$ref` fields by name in `libraryDefs` (case-insensitive, matching the
 *   uniqueness semantics the field-definitions API enforces on names), parsing their
 *   YAML definition, and applying the ref entry's `name` alias and `metadata.default`
 *   override (see {@link applyRefFieldOverride}).
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
    const normalizedRef = normalizeFieldDefinitionName(refField.$ref);
    const fd = libraryDefs.find((d) => normalizeFieldDefinitionName(d.name) === normalizedRef);
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

/**
 * Selects create-time Activity Log entries for `extended_fields`: only keys whose persisted
 * value differs from the resolved template + global defaults. A missing default is treated as
 * `''`, so untouched empty stamps and empty keys with no default stay out of the audit payload.
 *
 * Does not mutate persistence — callers still store the full map on the case SO. Distinct from
 * backfill "empty" semantics (`null`/`undefined` only); empty string is a real comparable value
 * here (e.g. clearing a non-empty default must still surface in Activity).
 */
export const pickExtendedFieldsDifferingFromDefaults = (
  persisted: Record<string, string>,
  defaults: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(persisted)) {
    if (value !== (defaults[key] ?? '')) {
      out[key] = value;
    }
  }
  return out;
};

export interface ExtendedFieldsDiff {
  /** Sorted list of keys whose values changed (added, removed, or modified). */
  changedFields: string[];
}

/**
 * Computes which extended-field keys changed between two snapshots. Both maps are treated as
 * `Record<string, unknown>` so the caller does not need to coerce SO values up front.
 *
 * Semantics:
 * - An own key whose value is `undefined` counts as **absent** (consistent with readExplicitValue).
 * - `''` is a real value distinct from absent — `absent → ''` and `'' → absent` both report a change.
 * - Unknown types are coerced via String() so `5` and `'5'` compare equal (no spurious changes).
 * - `changedFields` is alphabetically sorted for deterministic payloads.
 */
export const diffExtendedFields = (
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined
): ExtendedFieldsDiff => {
  const prev = previous ?? {};
  const nxt = next ?? {};

  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(nxt)])).sort();

  const changedFields: string[] = [];

  for (const key of allKeys) {
    const hasPrev = Object.prototype.hasOwnProperty.call(prev, key) && prev[key] !== undefined;
    const hasNext = Object.prototype.hasOwnProperty.call(nxt, key) && nxt[key] !== undefined;

    const prevVal = hasPrev ? String(prev[key]) : undefined;
    const nextVal = hasNext ? String(nxt[key]) : undefined;

    if (prevVal !== nextVal) {
      changedFields.push(key);
    }
  }

  return { changedFields };
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
 * Whether an `extended_fields` entry counts as "no v2 value" for backfill purposes: the key is
 * absent, or holds `null`/`undefined` (which no user-facing write path produces — the API and
 * UI only write strings — so a `null` can only come from synthetic/hand-inserted data).
 *
 * The empty string is deliberately NOT included. The v2 UI persists `''` both for fields the
 * user never touched AND for fields the user explicitly cleared (see `sanitizeExistingValue` /
 * the create-form serialization), and the migration task runs asynchronously: field definitions
 * become visible (phase 1, or the configure mirror hook) before a space's case backfill
 * (phase 2) completes, so a user can clear a value while the space is still unflagged. A `''`
 * observed at backfill time is therefore ambiguous, and filling it could silently restore a
 * stale legacy value over a deliberate clear — so it is always preserved.
 */
const isEmptyExtendedFieldValue = (value: unknown): boolean => value == null;

/**
 * Computes the `extended_fields` entries to add to a case from its legacy `customFields`.
 *
 * Semantics — **any existing entry wins (including `''`), nulls filled, absent filled**:
 * - A key present in `existingExtendedFields` with a string value — including the empty
 *   string — is left as-is: a value (or explicit clear) written through the v2 system takes
 *   precedence over the legacy mirror. See {@link isEmptyExtendedFieldValue} for why `''`
 *   must never be treated as fillable.
 * - A key that is absent or `null` counts as "no v2 value" and is filled from the legacy
 *   custom field.
 * - A `customFields` entry whose value is `null` or `undefined` is skipped — the case left the
 *   field empty; the v2 field then renders empty rather than being forced to a value.
 *
 * `resolveStorageKey` supplies the key to write under — the linked field definition's
 * `${name}_as_${type}` (never `${legacyKey}_as_${type}`; see `field_link_resolution.ts`'s
 * `toResolved`, the single source of truth for this derivation). A field with no resolvable
 * link (`undefined`) is skipped entirely rather than guessed at, matching the rest of the
 * migration's "never guess" linkage philosophy — this file is `common/` (shared with client
 * code) and cannot import the server-only link-resolution module directly, hence the callback.
 *
 * Returns only the entries to write (keys missing or empty). Callers are responsible for
 * spreading the result over the existing map.
 */
export const buildExtendedFieldsBackfill = (
  customFields: LegacyCaseCustomField[] | undefined,
  existingExtendedFields: Record<string, unknown> | null | undefined,
  resolveStorageKey: (customField: LegacyCaseCustomField) => string | undefined
): Record<string, string> => {
  const existing = existingExtendedFields ?? {};
  const additions: Record<string, string> = {};

  for (const cf of customFields ?? []) {
    const hasValue = cf.value !== null && cf.value !== undefined;
    const storageKey = hasValue ? resolveStorageKey(cf) : undefined;
    if (storageKey !== undefined && isEmptyExtendedFieldValue(existing[storageKey])) {
      additions[storageKey] = String(cf.value);
    }
  }

  return additions;
};
