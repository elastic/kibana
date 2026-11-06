/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSpokeHttpHeaders } from './spoke_http';

describe('validateSpokeHttpHeaders', () => {
  it('allows content-type and cache-control', () => {
    expect(
      validateSpokeHttpHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
    ).toEqual({
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
  });

  it('rejects Location and Set-Cookie', () => {
    expect(validateSpokeHttpHeaders({ Location: 'https://evil.example' })).toBe('invalid');
    expect(validateSpokeHttpHeaders({ 'Set-Cookie': 'a=b' })).toBe('invalid');
  });
});
