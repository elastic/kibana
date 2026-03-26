/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

apiTest.describe('Create new UIAM session', { tag: tags.serverless.security.complete }, () => {
  apiTest('should be able to authenticate as UIAM user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const response = await apiClient.get('internal/security/me', {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(expect.objectContaining({ username: '1806480617' }));
  });
});
