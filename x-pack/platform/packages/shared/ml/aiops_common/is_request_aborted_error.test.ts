/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRequestAbortedError } from './is_request_aborted_error';

describe('isRequestAbortedError', () => {
  it('returns false for a string', () => {
    expect(isRequestAbortedError('the-error')).toBe(false);
  });
  it('returns false for a an object without a name field', () => {
    expect(isRequestAbortedError({ error: 'the-error' })).toBe(false);
  });
  it(`returns false for a an object with a name field other than 'RequestAbortedError'`, () => {
    expect(isRequestAbortedError({ name: 'the-error' })).toBe(false);
  });
  it(`returns true for a an object with a name field that contains 'RequestAbortedError'`, () => {
    expect(isRequestAbortedError({ name: 'RequestAbortedError' })).toBe(true);
  });
});
