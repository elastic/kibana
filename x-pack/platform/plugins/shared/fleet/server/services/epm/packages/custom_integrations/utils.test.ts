/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertStringToTitle } from './utils';

describe('convertStringToTitle', () => {
  it('works without underscore: test', () => {
    expect(convertStringToTitle('test')).toBe('Test');
  });

  it('works with one underscore test_test', () => {
    expect(convertStringToTitle('test_test')).toBe('Test Test');
  });

  it('works with double underscore: test__test', () => {
    expect(convertStringToTitle('test__test')).toBe('Test Test');
  });
});
