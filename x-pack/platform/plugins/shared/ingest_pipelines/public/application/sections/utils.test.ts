/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorText } from './utils';

describe('getErrorText', () => {
  it('it returns the message if present', () => {
    expect(
      getErrorText({
        error: 'Some error',
        message: 'Some message',
      })
    ).toBe('Some message');
  });

  it('it returns the error if no message', () => {
    expect(
      getErrorText({
        error: 'Some error',
      })
    ).toBe('Some error');
  });

  it('it returns the error if message is empty', () => {
    expect(
      getErrorText({
        error: 'Some error',
        message: '{}',
      })
    ).toBe('Some error');
  });
});
