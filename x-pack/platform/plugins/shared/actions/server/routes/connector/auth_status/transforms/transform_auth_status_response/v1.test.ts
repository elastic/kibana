/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAuthStatusResponseV1 } from './v1';

describe('transformAuthStatusResponseV1', () => {
  test('transforms empty result', () => {
    expect(transformAuthStatusResponseV1({})).toEqual({});
  });

  test('transforms mixed statuses to snake_case user_auth_status', () => {
    expect(
      transformAuthStatusResponseV1({
        a: { userAuthStatus: 'connected' },
        b: { userAuthStatus: 'not_connected' },
        c: { userAuthStatus: 'not_applicable' },
      })
    ).toEqual({
      a: { user_auth_status: 'connected' },
      b: { user_auth_status: 'not_connected' },
      c: { user_auth_status: 'not_applicable' },
    });
  });

  test('preserves all connector ids as keys', () => {
    const input = {
      'connector-1': { userAuthStatus: 'not_applicable' as const },
      'other-id': { userAuthStatus: 'connected' as const },
    };
    const body = transformAuthStatusResponseV1(input);
    expect(Object.keys(body).sort()).toEqual(['connector-1', 'other-id']);
  });
});
