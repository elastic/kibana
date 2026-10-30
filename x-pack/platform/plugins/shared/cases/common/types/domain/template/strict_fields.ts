/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { InlineFieldSchema, FieldSchema, isRefField, isDisplayOnlyField } from './fields';
import type { Field, InlineField, RefField } from './fields';
import {
  getAuthorableFieldNameViolation,
  getFoldedFieldName,
} from '../../../utils/template_fields';
import type { AuthorableKeyViolation } from '../../../utils/template_fields';
import { LONGEST_STORAGE_TYPE, MAX_SNAKE_KEY_LENGTH } from '../../../constants';

/**
 * Error message for a field `name` or `$ref` alias with a character outside the authoring
 * charset (`AUTHORABLE_SNAKE_KEY`). Names the offending field, states the expected format,
 * and warns that renaming to fix it orphans values already stored under the old name.
 * Shared with the template editor's inline markers — see `createInvalidNameMarkers`.
 */
export const charsetNameMessage = (name: string): string =>
  `Field name "${name}" must contain only letters (A-Z, a-z), digits, and underscores. ` +
  `Renaming a field doesn't move values already stored under the old name.`;

/**
 * Error message for a field `name` or `$ref` alias whose derived storage key exceeds
 * `MAX_SNAKE_KEY_LENGTH`. Kept separate from {@link charsetNameMessage} because a long,
 * clean snake_case name already satisfies the charset rule — telling its author to remove
 * special characters would be misleading.
 */
export const nameTooLongMessage = (name: string): string =>
  `Field name "${name}" is too long. The storage key built from the name and field type ` +
  `can't exceed ${MAX_SNAKE_KEY_LENGTH} characters. Use a shorter name.`;

/**
 * Error message for a new field `name` whose camelCase-folded form matches an existing
 * field's folded form (see {@link getFoldedFieldName}). The case list and case view read
 * values through the folded key, so such twins silently show each other's values.
 */
export const foldedNameCollisionMessage = (name: string, existingName: string): string =>
  `Field name "${name}" conflicts with the existing field "${existingName}". ` +
  `Kibana reads both names as the same key, so the two fields would show each other's values. ` +
  `Use a name that differs by more than hyphens, underscores, or capitalization.`;

const violationMessage = (violation: AuthorableKeyViolation, name: string): string =>
  violation === 'length' ? nameTooLongMessage(name) : charsetNameMessage(name);

/**
 * The stored names an update validates against: `grandfatheredNames` for the byte-exact
 * skip (requirement: don't lock legacy names out of unrelated edits) and `foldedNameIndex`
 * (folded form → stored name) for the twin check on names that are genuinely new.
 */
interface ExistingNamesContext {
  readonly grandfatheredNames: ReadonlySet<string>;
  readonly foldedNameIndex: ReadonlyMap<string, string>;
}

/** The create-path default: nothing stored yet, so nothing to grandfather or collide with. */
const EMPTY_EXISTING_NAMES: ExistingNamesContext = {
  grandfatheredNames: new Set(),
  foldedNameIndex: new Map(),
};

const buildExistingNamesContext = (
  grandfatheredNames?: ReadonlySet<string>
): ExistingNamesContext => {
  if (grandfatheredNames === undefined || grandfatheredNames.size === 0) {
    return EMPTY_EXISTING_NAMES;
  }
  const foldedNameIndex = new Map<string, string>();
  for (const name of grandfatheredNames) {
    foldedNameIndex.set(getFoldedFieldName(name), name);
  }
  return { grandfatheredNames, foldedNameIndex };
};

/**
 * Validates one candidate name against the authoring rules, in precedence order:
 * 1. Byte-exact match with a stored name — grandfathered, no checks. A rename, even to
 *    another invalid name, is treated as new.
 * 2. Charset / length violation on the derived `<name>_as_<type>` key.
 * 3. Folded-form collision with a stored name (`my_field` vs stored `my-field`) — the UI
 *    reads values through the camelCase-folded key, so such twins show each other's values.
 */
const assertAuthorableName = (
  name: string,
  type: string,
  { grandfatheredNames, foldedNameIndex }: ExistingNamesContext,
  ctx: z.RefinementCtx
): void => {
  if (grandfatheredNames.has(name)) return;

  const violation = getAuthorableFieldNameViolation(name, type);
  if (violation !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: violationMessage(violation, name),
    });
    return;
  }

  // The byte-exact grandfather above already returned for a name identical to a stored one,
  // so any hit here is a genuine twin — a different spelling folding onto a stored name.
  const collidingName = foldedNameIndex.get(getFoldedFieldName(name));
  if (collidingName !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: foldedNameCollisionMessage(name, collidingName),
    });
  }
};

const assertInlineFieldName = (
  field: InlineField,
  existingNames: ExistingNamesContext,
  ctx: z.RefinementCtx
): void => {
  // Display-only fields (MARKDOWN) hold no value and are excluded from `extended_fields` and
  // from the analytics data-view — their `name` never becomes a storage key or reaches a Painless
  // literal, so the charset restriction has no safety benefit there and would unnecessarily
  // reject template entries whose markdown label contains spaces, hyphens, etc.
  if (isDisplayOnlyField(field)) return;

  assertAuthorableName(field.name, field.type, existingNames, ctx);
};

const assertRefFieldAlias = (
  field: RefField,
  existingNames: ExistingNamesContext,
  ctx: z.RefinementCtx
): void => {
  const alias = field.name;
  if (alias == null) return; // optional — absent aliases are fine

  // A $ref alias has no locally-known type at the authoring stage, so validate against the
  // worst-case type (longest suffix, LONGEST_STORAGE_TYPE from common/constants) to guarantee
  // the result fits MAX_SNAKE_KEY_LENGTH for any field type. A unit test asserts
  // LONGEST_STORAGE_TYPE is actually the longest literal in the field schemas, so this cannot
  // drift silently.
  assertAuthorableName(alias, LONGEST_STORAGE_TYPE, existingNames, ctx);
};

/**
 * Strict variant of `InlineFieldSchema` — adds authoring-charset validation on `name`.
 * Use this at write time; use the lenient `InlineFieldSchema` for reads and previews.
 *
 * Authoring charset: letters (A-Z, a-z), digits, and underscores — no hyphens, spaces, dots,
 * or quotes. Enforced by `AUTHORABLE_SNAKE_KEY` in `common/constants/index.ts`.
 */
export const StrictInlineFieldSchema = InlineFieldSchema.superRefine(
  (field: InlineField, ctx: z.RefinementCtx) =>
    assertInlineFieldName(field, EMPTY_EXISTING_NAMES, ctx)
);

/**
 * Strict variant of `FieldSchema` (inline + ref), grandfathering the given set of names/aliases.
 * For inline entries the `name` must pass the authoring charset; for `$ref` entries the optional
 * `name` alias is checked against the worst-case type. A name in `grandfatheredNames` skips the
 * checks when it matches byte-exactly (see `collectExistingFieldNames`); a name that instead
 * camelCase-folds onto one of them is rejected as a twin — see `foldedNameCollisionMessage`.
 *
 * Use this at write time; use the lenient `FieldSchema` for reads and previews.
 */
export const buildStrictFieldSchema = (grandfatheredNames?: ReadonlySet<string>) => {
  const existingNames = buildExistingNamesContext(grandfatheredNames);
  return FieldSchema.superRefine((field: Field, ctx: z.RefinementCtx) => {
    if (isRefField(field)) {
      assertRefFieldAlias(field, existingNames, ctx);
    } else {
      assertInlineFieldName(field, existingNames, ctx);
    }
  });
};

/** Strict `FieldSchema` with no grandfathered names — the create-path default. */
export const StrictFieldSchema = buildStrictFieldSchema();

export type StrictField = z.infer<typeof StrictFieldSchema>;

/**
 * Strict `fields` array: each entry must pass the authoring-charset check (unless grandfathered)
 * AND all names must be unique. Uniqueness logic mirrors `ParsedTemplateDefinitionSchema` in
 * `v1.ts`.
 *
 * `grandfatheredNames` — typically the names/aliases already present in a template's
 * currently-stored definition (see `collectExistingFieldNames`) — lets an UPDATE keep an
 * untouched field whose name predates the authoring-charset rule, while still rejecting a
 * brand-new or renamed field with a name that fails the checks, including one that merely
 * camelCase-folds onto a stored name. Omit for CREATE, where there is no existing definition
 * to grandfather against.
 */
export const buildStrictFieldsArraySchema = (grandfatheredNames?: ReadonlySet<string>) =>
  z.array(buildStrictFieldSchema(grandfatheredNames)).refine(
    (fields) => {
      const fieldNames = new Set(
        fields.map((field) => (isRefField(field) ? field.name ?? field.$ref : field.name))
      );
      return fieldNames.size === fields.length;
    },
    { message: 'Field names must be unique.' }
  );

/** Strict fields-array schema with no grandfathered names — the create-path default. */
export const StrictFieldsArraySchema = buildStrictFieldsArraySchema();

/**
 * Collects the field names (inline) and `$ref` aliases already present in a template's
 * currently-stored definition, for grandfathering on update (see `buildStrictFieldsArraySchema`).
 * Byte-exact strings only — no normalization — so a rename, even to another invalid name, is
 * treated as new rather than silently grandfathered.
 *
 * Display-only (MARKDOWN) names are excluded: their labels legitimately contain any characters
 * because they never become storage keys, so `assertInlineFieldName` exempts them without
 * grandfathering. Including them here would let an update that switches such an entry to a
 * value-bearing control carry an arbitrary-charset name past every check, and would make the
 * twin check falsely reject a valid new name that folds onto a markdown label.
 */
export const collectExistingFieldNames = (fields: readonly Field[]): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const field of fields) {
    if (field.name != null && !isDisplayOnlyField(field)) {
      names.add(field.name);
    }
  }
  return names;
};
