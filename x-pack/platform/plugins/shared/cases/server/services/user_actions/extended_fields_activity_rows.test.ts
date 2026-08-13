/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExtendedFieldsActivityRowCount } from './extended_fields_activity_rows';

describe('getExtendedFieldsActivityRowCount', () => {
  it('returns 1 for null, undefined, or non-object payloads', () => {
    expect(getExtendedFieldsActivityRowCount(null)).toBe(1);
    expect(getExtendedFieldsActivityRowCount(undefined)).toBe(1);
    expect(getExtendedFieldsActivityRowCount([] as unknown as Record<string, unknown>)).toBe(1);
  });

  it('returns 1 for an empty object (fallback history row)', () => {
    expect(getExtendedFieldsActivityRowCount({})).toBe(1);
  });

  it('returns the number of field keys for multi-field updates', () => {
    expect(
      getExtendedFieldsActivityRowCount({
        risk_score_as_keyword: 'high',
        label_as_keyword: 'a',
        my_field_as_keyword: 'b',
      })
    ).toBe(3);
  });
});
