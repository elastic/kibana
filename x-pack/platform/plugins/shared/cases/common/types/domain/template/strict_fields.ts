/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { InlineFieldSchema, FieldSchema, isRefField, isDisplayOnlyField } from './fields';
import type { Field, InlineField, RefField } from './fields';
import { isAuthorableExtendedFieldName } from '../../../utils/template_fields';
import { LONGEST_STORAGE_TYPE } from '../../../constants';

/**
 * Error message used when a field `name` or `$ref` alias produces a key that is outside the
 * authoring charset (`AUTHORABLE_SNAKE_KEY`). The message names the offending name so the
 * author can identify which field to fix; it also notes that renaming orphans already-stored
 * values.
 */
const invalidNameMessage = (name: string): string =>
  `Field name "${name}" produces an invalid storage key. ` +
  `Names must contain only letters (A-Z, a-z), digits, and underscores. ` +
  `Note: renaming a field does not migrate values already stored under the old key.`;

const assertInlineFieldName = (field: InlineField, ctx: z.RefinementCtx): void => {
  // Display-only fields (MARKDOWN) hold no value and are excluded from `extended_fields` and
  // from the analytics data-view — their `name` never becomes a storage key or reaches a Painless
  // literal, so the charset restriction has no safety benefit there and would unnecessarily
  // reject template entries whose markdown label contains spaces, hyphens, etc.
  if (isDisplayOnlyField(field)) return;

  if (!isAuthorableExtendedFieldName(field.name, field.type)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: invalidNameMessage(field.name),
    });
  }
};

const assertRefFieldAlias = (field: RefField, ctx: z.RefinementCtx): void => {
  const alias = field.name;
  if (alias == null) return; // optional — absent aliases are fine

  // A $ref alias has no locally-known type at the authoring stage, so validate against the
  // worst-case type (longest suffix, LONGEST_STORAGE_TYPE from common/constants) to guarantee
  // the result fits MAX_SNAKE_KEY_LENGTH for any field type. A unit test asserts
  // LONGEST_STORAGE_TYPE is actually the longest literal in the field schemas, so this cannot
  // drift silently.
  if (!isAuthorableExtendedFieldName(alias, LONGEST_STORAGE_TYPE)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: invalidNameMessage(alias),
    });
  }
};

/**
 * Strict variant of `InlineFieldSchema` — adds authoring-charset validation on `name`.
 * Use this at write time; use the lenient `InlineFieldSchema` for reads and previews.
 *
 * Authoring charset: letters (A-Z, a-z), digits, and underscores — no hyphens, spaces, dots,
 * or quotes. Enforced by `AUTHORABLE_SNAKE_KEY` in `common/constants/index.ts`.
 */
export const StrictInlineFieldSchema = InlineFieldSchema.superRefine(assertInlineFieldName);

/**
 * Strict variant of `FieldSchema` (inline + ref). For inline entries the `name` must pass the
 * authoring charset; for `$ref` entries the optional `name` alias is checked against the
 * worst-case type.
 *
 * Use this at write time; use the lenient `FieldSchema` for reads and previews.
 */
export const StrictFieldSchema = FieldSchema.superRefine((field: Field, ctx: z.RefinementCtx) => {
  if (isRefField(field)) {
    assertRefFieldAlias(field, ctx);
  } else {
    assertInlineFieldName(field, ctx);
  }
});

export type StrictField = z.infer<typeof StrictFieldSchema>;

/**
 * Strict `fields` array: each entry must pass the authoring-charset check AND all names must
 * be unique. Uniqueness logic mirrors `ParsedTemplateDefinitionSchema` in `v1.ts`.
 */
export const StrictFieldsArraySchema = z.array(StrictFieldSchema).refine(
  (fields) => {
    const fieldNames = new Set(
      fields.map((field) => (isRefField(field) ? field.name ?? field.$ref : field.name))
    );
    return fieldNames.size === fields.length;
  },
  { message: 'Field names must be unique.' }
);
