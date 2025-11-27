/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect } from '@kbn/scout';

import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe('Create new UIAM session', { tag: ['@svlSecurity'] }, () => {
  let userSessionCookie: string;
  apiTest.beforeAll(async ({ samlAuth }) => {
    userSessionCookie = `sid=${await samlAuth.session.getInteractiveUserSessionCookieWithRoleScope(
      'viewer'
    )}`;
  });

  apiTest('should be able to authenticate as UIAM user', async ({ apiClient }) => {
    const response = await apiClient.get('internal/security/me', {
      headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual(expect.objectContaining({ username: '1806480617' }));
  });
});
