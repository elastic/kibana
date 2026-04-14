/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSortedValue } from './has_sorted_value';

describe('hasSortedValue', () => {
  it('returns true when target exists', () => {
    expect(hasSortedValue([1, 3, 5, 8], 5)).toBe(true);
  });

  it('returns false when target does not exist', () => {
    expect(hasSortedValue([1, 3, 5, 8], 4)).toBe(false);
  });
});
