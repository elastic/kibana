/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExtendedFieldsBackfill } from './build_case_extended_fields';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';

describe('buildExtendedFieldsBackfill', () => {
  it('returns nothing when there are no custom fields', () => {
    expect(buildExtendedFieldsBackfill(undefined, {})).toEqual({});
    expect(buildExtendedFieldsBackfill([], {})).toEqual({});
  });

  it('maps each v1 custom field type to the matching extended_fields key and stringified value', () => {
    const result = buildExtendedFieldsBackfill(
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
    const result = buildExtendedFieldsBackfill(
      [{ key: 'flag', type: CustomFieldTypes.TOGGLE, value: false }],
      {}
    );
    expect(result).toEqual({ flag_as_boolean: 'false' });
  });

  it('skips null and undefined values (the case left the field empty)', () => {
    const result = buildExtendedFieldsBackfill(
      [
        { key: 'a', type: CustomFieldTypes.TEXT, value: null },
        { key: 'b', type: CustomFieldTypes.NUMBER, value: undefined },
        { key: 'c', type: CustomFieldTypes.TEXT, value: 'kept' },
      ],
      {}
    );
    expect(result).toEqual({ c_as_keyword: 'kept' });
  });

  it('never overwrites a key already present in extended_fields', () => {
    const result = buildExtendedFieldsBackfill(
      [
        { key: 'summary', type: CustomFieldTypes.TEXT, value: 'from-legacy' },
        { key: 'count', type: CustomFieldTypes.NUMBER, value: 9 },
      ],
      { summary_as_keyword: 'already-set-in-v2' }
    );
    // summary is left as-is; only the missing key is added
    expect(result).toEqual({ count_as_integer: '9' });
  });

  it('treats a null extended_fields the same as empty', () => {
    const result = buildExtendedFieldsBackfill(
      [{ key: 'a', type: CustomFieldTypes.TEXT, value: 'x' }],
      null
    );
    expect(result).toEqual({ a_as_keyword: 'x' });
  });

  it('preserves a zero number value', () => {
    const result = buildExtendedFieldsBackfill(
      [{ key: 'n', type: CustomFieldTypes.NUMBER, value: 0 }],
      {}
    );
    expect(result).toEqual({ n_as_integer: '0' });
  });
});
