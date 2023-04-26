/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSignificantTerm } from './type_guards';

describe('isSignificantTerm', () => {
  it('identifies significant terms', () => {
    expect(isSignificantTerm({})).toBeFalsy();
    expect(isSignificantTerm({ fieldName: 'response_code' })).toBeFalsy();
    expect(isSignificantTerm({ fieldValue: '500' })).toBeFalsy();
    expect(
      isSignificantTerm({
        fieldName: 'response_code',
        fieldValue: '500',
        doc_count: 1819,
        bg_count: 553,
        total_doc_count: 4671,
        total_bg_count: 1975,
        score: 26.546201745993947,
        pValue: 2.9589053032077285e-12,
        normalizedScore: 0.7814127409489161,
      })
    ).toBeTruthy();
  });
});
