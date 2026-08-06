/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeTags } from './normalize_tags';

describe('normalizeTags', () => {
  it('returns empty array for null and undefined', () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it('wraps a string in a single-element array', () => {
    expect(normalizeTags('solo')).toEqual(['solo']);
  });

  it('returns arrays as-is', () => {
    expect(normalizeTags(['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeTags([])).toEqual([]);
  });
});
