/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldValuePairKey } from './get_field_value_pair_key';

describe('getFieldValuePairKey', () => {
  it('creates a stable key for a field/value pair', () => {
    expect(getFieldValuePairKey('status_code', 500)).toBe('["status_code",500]');
  });

  it('does not collide string and numeric values', () => {
    expect(getFieldValuePairKey('status_code', 500)).not.toBe(
      getFieldValuePairKey('status_code', '500')
    );
  });
});
