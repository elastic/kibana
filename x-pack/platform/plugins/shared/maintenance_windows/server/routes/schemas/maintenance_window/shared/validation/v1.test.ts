/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validatePagination } from './v1';

describe('validatePagination', () => {
  it('validates undefined page and per_page values', () => {
    expect(validatePagination({})).toBeUndefined();
  });

  it('validates page and per_page values', () => {
    expect(validatePagination({ page: 1, per_page: 2 })).toBeUndefined();
  });

  it('returns error message when value is too high', () => {
    expect(validatePagination({ page: 101, per_page: 100 })).toBe(
      'The number of documents is too high. Paginating through more than 10000 documents is not possible.'
    );
  });
});
