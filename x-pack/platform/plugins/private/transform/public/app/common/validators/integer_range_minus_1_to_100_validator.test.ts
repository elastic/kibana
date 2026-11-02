/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { integerRangeMinus1To100Validator } from './integer_range_minus_1_to_100_validator';

const errorMessage = 'Number of retries needs to be between 0 and 100, or -1 for infinite retries.';

describe('Transform: integerRangeMinus1To100Validator()', () => {
  it.each(['-1', '0', '7', '100'])('accepts %s', (value) => {
    expect(integerRangeMinus1To100Validator(value)).toEqual([]);
  });

  it.each(['-2', '101', '1.5', 'abc'])('rejects %s', (value) => {
    expect(integerRangeMinus1To100Validator(value)).toEqual([errorMessage]);
  });
});
