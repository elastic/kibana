/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEsServiceAccountToken } from './es_service_account_token';

const toServiceAccountToken = (value: string) =>
  Buffer.concat([Buffer.from([0, 1, 0, 1]), Buffer.from(value)])
    .toString('base64')
    .replace(/=+$/, '');

describe('isEsServiceAccountToken', () => {
  it('recognizes a user-managed service account token', () => {
    const token = toServiceAccountToken('kibana/automation/t1:secret');
    expect(token.startsWith('AAEAAW')).toBe(true);
    expect(isEsServiceAccountToken(token)).toBe(true);
  });

  it('recognizes a built-in service account token', () => {
    expect(isEsServiceAccountToken(toServiceAccountToken('elastic/fleet-server/t1:secret'))).toBe(
      true
    );
  });

  it.each([
    ['an empty string', ''],
    ['a string shorter than the prefix', 'AAEA'],
    ['a JWT', 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJl'],
    ['an Elasticsearch access token', 'dGhpcyBpcyBhbiBhY2Nlc3MgdG9rZW4='],
    ['a UIAM credential', 'essu_dev_c29tZS11aWFtLXRva2Vu'],
    ['a different prefix', Buffer.from([0, 1, 0, 2, 9, 9]).toString('base64')],
  ])('rejects %s', (_, credentials) => {
    expect(isEsServiceAccountToken(credentials)).toBe(false);
  });
});
