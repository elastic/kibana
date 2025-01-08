/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateByMonth } from './v1';

describe('validateByMonth', () => {
  test('returns an error if the are no values', () => {
    expect(validateByMonth([])).toEqual('rRule bymonth cannot be empty');
  });

  test('returns an error if the values are less than one', () => {
    expect(validateByMonth([0])).toEqual('rRule bymonth should be between 1 and 12 inclusive');
  });

  test('returns an error if the values are bigger than 12', () => {
    expect(validateByMonth([13])).toEqual('rRule bymonth should be between 1 and 12 inclusive');
  });

  test('returns an error with valid and invalid values', () => {
    expect(validateByMonth([2, 14])).toEqual('rRule bymonth should be between 1 and 12 inclusive');
  });

  test('does not return an error with valid values', () => {
    expect(validateByMonth([2, 5, 7])).toEqual(undefined);
  });
});
