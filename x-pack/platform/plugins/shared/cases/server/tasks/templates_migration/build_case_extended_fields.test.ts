/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExtendedFieldsBackfill } from './build_case_extended_fields';
import { getFieldSnakeKey, getV2FieldType } from '../../../common/utils/template_fields';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';

describe('buildExtendedFieldsBackfill', () => {
  // Most of these tests exercise value/precedence semantics independent of key derivation, so
  // they resolve every field to its raw-key-based storage key (matching pre-friendly-name
  // behavior) via this stub resolver. Dedicated tests below cover link-resolution itself —
  // `run_case_backfill.ts` supplies the real resolver, backed by field_link_resolution.ts.
  const rawKeyBackfill = (
    customFields: Array<{ key: string; type: string; value: unknown }> | undefined,
    existingExtendedFields: Record<string, unknown> | null | undefined
  ) =>
    buildExtendedFieldsBackfill(customFields, existingExtendedFields, (cf) =>
      getFieldSnakeKey(cf.key, getV2FieldType(cf.type))
    );

  it('returns nothing when there are no custom fields', () => {
    expect(rawKeyBackfill(undefined, {})).toEqual({});
    expect(rawKeyBackfill([], {})).toEqual({});
  });

  it('skips a field with no resolvable storage key rather than guessing at the raw legacy key', () => {
    const result = buildExtendedFieldsBackfill(
      [{ key: 'unresolved', type: CustomFieldTypes.TEXT, value: 'x' }],
      {},
      () => undefined
    );

    expect(result).toEqual({});
  });

  it('uses the resolver-provided storage key (the linked definition name), not the raw legacy key', () => {
    const result = buildExtendedFieldsBackfill(
      [{ key: 'd64293ff-7ae5-4512-a01a-069b1efdc171', type: CustomFieldTypes.TEXT, value: 'hey' }],
      {},
      () => 'legacy_text_required_as_keyword'
    );

    expect(result).toEqual({ legacy_text_required_as_keyword: 'hey' });
  });

  it('maps each v1 custom field type to the matching extended_fields key and stringified value', () => {
    const result = rawKeyBackfill(
      [
        { key: 'summary', type: CustomFieldTypes.TEXT, value: 'hello' },
        { key: 'count', type: CustomFieldTypes.NUMBER, value: 7 },
        { key: 'flag', type: CustomFieldTypes.TOGGLE, value: true },
      ],
      {}
    );

    // text → _as_keyword, number → _as_integer, toggle → _as_boolean (matches getV2FieldType / the field-def migration)
    expect(result).toEqual({
      summary_as_keyword: 'hello',
      count_as_integer: '7',
      flag_as_boolean: 'true',
    });
  });

  it('stringifies a false toggle rather than dropping it', () => {
    const result = rawKeyBackfill(
      [{ key: 'flag', type: CustomFieldTypes.TOGGLE, value: false }],
      {}
    );
    expect(result).toEqual({ flag_as_boolean: 'false' });
  });

  it('skips null and undefined values (the case left the field empty)', () => {
    const result = rawKeyBackfill(
      [
        { key: 'a', type: CustomFieldTypes.TEXT, value: null },
        { key: 'b', type: CustomFieldTypes.NUMBER, value: undefined },
        { key: 'c', type: CustomFieldTypes.TEXT, value: 'kept' },
      ],
      {}
    );
    expect(result).toEqual({ c_as_keyword: 'kept' });
  });

  it('never overwrites a key already present in extended_fields with a non-empty value', () => {
    const result = rawKeyBackfill(
      [
        { key: 'summary', type: CustomFieldTypes.TEXT, value: 'from-legacy' },
        { key: 'count', type: CustomFieldTypes.NUMBER, value: 9 },
      ],
      { summary_as_keyword: 'already-set-in-v2' }
    );
    // summary is left as-is; only the missing key is added
    expect(result).toEqual({ count_as_integer: '9' });
  });

  it('never overwrites an empty-string entry (a possible deliberate v2 clear) but fills null', () => {
    // '' is ambiguous: the v2 UI writes it both for untouched fields and for explicit clears,
    // and users can clear values while the space's backfill is still pending — so '' always
    // wins over the legacy mirror. null cannot come from any user-facing write path, so it is
    // treated as "no v2 value" and filled.
    const result = rawKeyBackfill(
      [
        { key: 'summary', type: CustomFieldTypes.TEXT, value: 'from-legacy' },
        { key: 'count', type: CustomFieldTypes.NUMBER, value: 9 },
      ],
      { summary_as_keyword: '', count_as_integer: null }
    );
    expect(result).toEqual({ count_as_integer: '9' });
  });

  it('treats a null extended_fields the same as empty', () => {
    const result = rawKeyBackfill([{ key: 'a', type: CustomFieldTypes.TEXT, value: 'x' }], null);
    expect(result).toEqual({ a_as_keyword: 'x' });
  });

  it('preserves a zero number value', () => {
    const result = rawKeyBackfill([{ key: 'n', type: CustomFieldTypes.NUMBER, value: 0 }], {});
    expect(result).toEqual({ n_as_integer: '0' });
  });
});
