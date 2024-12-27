/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefaultSearchQuery } from './common';

describe('isDefaultSearchQuery', () => {
  it('returns true for default search query', () => {
    expect(isDefaultSearchQuery({ match_all: {} })).toBe(true);
  });

  it('returns false for non default search query', () => {
    expect(
      isDefaultSearchQuery({
        bool: { must_not: [{ term: { 'the-term': 'the-value' } }] },
      })
    ).toBe(false);
  });
});
