/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeSpokeHttpHeaders } from './spoke_http';

describe('sanitizeSpokeHttpHeaders', () => {
  it('allows content-type and cache-control', () => {
    expect(
      sanitizeSpokeHttpHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
    ).toEqual({
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
  });

  it('rejects Location and Set-Cookie', () => {
    expect(sanitizeSpokeHttpHeaders({ Location: 'https://evil.example' })).toBe('invalid');
    expect(sanitizeSpokeHttpHeaders({ 'Set-Cookie': 'a=b' })).toBe('invalid');
  });
});
