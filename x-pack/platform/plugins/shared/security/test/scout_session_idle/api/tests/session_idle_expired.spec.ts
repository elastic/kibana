/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { SESSION_ERROR_REASON_HEADER } from '../../../../common/constants';
import {
  ensureSessionIndexReady,
  getSessionCount,
  invalidateAllSessions,
  LOCAL_STATEFUL_TAGS,
  loginWithBasic,
  SESSION_API_HEADERS,
} from '../../../session_management/helpers';

test.describe('Session Idle expired', { tag: [...LOCAL_STATEFUL_TAGS] }, () => {
  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await ensureSessionIndexReady(esClient);
    await invalidateAllSessions(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 10000 }).toBe(0);
  });

  test(`should return ${SESSION_ERROR_REASON_HEADER} header if session is expired`, async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(100000);

    const cookie = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 5000 }).toBe(1);

    const meResponse = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookie },
    });
    expect(meResponse).toHaveStatusCode(200);

    await expect
      .poll(
        async () => {
          const expiredResponse = await apiClient.get('/internal/security/me', {
            headers: { ...SESSION_API_HEADERS, Cookie: cookie },
          });
          return expiredResponse.statusCode;
        },
        { timeout: 20000 }
      )
      .toBe(401);

    const expiredResponse = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookie },
    });
    expect(expiredResponse).toHaveStatusCode(401);
    expect(expiredResponse.headers[SESSION_ERROR_REASON_HEADER]).toBe('SESSION_IDLE_TIMEOUT');
  });
});
