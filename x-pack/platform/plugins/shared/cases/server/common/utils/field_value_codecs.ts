/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';

/**
 * Reversible value codecs between the v1 `customFields` representation and the
 * v2 `extended_fields` string storage, per linked v1 field type:
 *
 * | v1 type / value      | v2 storage value          | reverse conversion      |
 * | -------------------- | ------------------------- | ----------------------- |
 * | `text` / string      | the string                | the string              |
 * | `number` / integer   | canonical base-10 string  | validated safe integer  |
 * | `toggle` / boolean   | `'true'` or `'false'`     | strict boolean          |
 *
 * No generic truthiness, permissive numeric parsing, locale formatting, or
 * `String(value)` fallbacks: an unsupported type or non-canonical storage
 * value is a codec failure the caller must surface as a validation error —
 * never silently coerced.
 *
 * The canonical v1 empty value is `null` for all three types; the v2 empty
 * representation is an absent key. `''` on the v2 wire is the explicit clear
 * marker (plan addendum A2) and is handled by the pairing layer, not here.
 */

export type LegacyFieldValue = string | number | boolean | null;

export type CodecResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Canonical base-10 integer: optional minus, no leading zeros, no `-0`. */
const CANONICAL_INTEGER = /^-?(0|[1-9][0-9]*)$/;

/**
 * Encodes a non-null v1 value into its v2 storage string. `null` (the v1 empty
 * value) has no storage encoding — callers delete the storage key instead.
 */
export const encodeLegacyFieldValue = (
  type: string,
  value: NonNullable<LegacyFieldValue>
): CodecResult<string> => {
  switch (type) {
    case CustomFieldTypes.TEXT:
      return typeof value === 'string'
        ? { ok: true, value }
        : { ok: false, error: `expected a string value for a "${type}" field` };
    case CustomFieldTypes.NUMBER:
      return typeof value === 'number' && Number.isSafeInteger(value)
        ? { ok: true, value: String(value) }
        : { ok: false, error: `expected a safe integer value for a "${type}" field` };
    case CustomFieldTypes.TOGGLE:
      return typeof value === 'boolean'
        ? { ok: true, value: value ? 'true' : 'false' }
        : { ok: false, error: `expected a boolean value for a "${type}" field` };
    default:
      return { ok: false, error: `unsupported linked field type "${type}"` };
  }
};

/**
 * Decodes a v2 storage string back into the v1 value for the linked field
 * type. The empty-string clear marker must be handled by the caller before
 * decoding.
 */
export const decodeStorageFieldValue = (
  type: string,
  storageValue: string
): CodecResult<NonNullable<LegacyFieldValue>> => {
  switch (type) {
    case CustomFieldTypes.TEXT:
      return { ok: true, value: storageValue };
    case CustomFieldTypes.NUMBER: {
      if (!CANONICAL_INTEGER.test(storageValue) || storageValue === '-0') {
        return {
          ok: false,
          error: `expected a canonical base-10 integer string, got "${storageValue}"`,
        };
      }
      const parsed = Number(storageValue);
      return Number.isSafeInteger(parsed)
        ? { ok: true, value: parsed }
        : { ok: false, error: `integer "${storageValue}" is outside the safe integer range` };
    }
    case CustomFieldTypes.TOGGLE:
      if (storageValue === 'true') {
        return { ok: true, value: true };
      }
      if (storageValue === 'false') {
        return { ok: true, value: false };
      }
      return { ok: false, error: `expected "true" or "false", got "${storageValue}"` };
    default:
      return { ok: false, error: `unsupported linked field type "${type}"` };
  }
};

/**
 * Semantic equality between the two representations of one linked field.
 * The canonical v1 empty value (`null`/`undefined`) and an absent v2 key
 * (`undefined`) — or the explicit v2 clear marker `''` — are equivalent.
 * Non-empty pairs compare through the canonical encoding, so a non-canonical
 * v2 value (e.g. `'007'`) never equals a v1 value.
 */
export const areFieldRepresentationsEqual = (
  type: string,
  legacyValue: LegacyFieldValue | undefined,
  storageValue: string | undefined
): boolean => {
  const legacyEmpty = legacyValue === null || legacyValue === undefined;
  const storageEmpty = storageValue === undefined || storageValue === '';

  if (legacyEmpty || storageEmpty) {
    return legacyEmpty && storageEmpty;
  }

  const encoded = encodeLegacyFieldValue(type, legacyValue);
  return encoded.ok && encoded.value === storageValue;
};
