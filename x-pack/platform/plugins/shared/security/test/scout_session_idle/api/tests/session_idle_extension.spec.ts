/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  extractSessionCookie,
  getSessionsCreatedAt,
  LOCAL_STATEFUL_TAGS,
  loginWithBasic,
  SESSION_API_HEADERS,
} from '../../../session_management/helpers';

const IDLE_TIMEOUT_MS = 10_000;

test.describe('Session Idle extension', { tag: [...LOCAL_STATEFUL_TAGS] }, () => {
  let sessionCookie: string;

  test.beforeEach(async ({ apiClient, config }) => {
    sessionCookie = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
  });

  test('GET /internal/security/session should return current session information', async ({
    apiClient,
  }) => {
    const response = await apiClient.get('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, 'kbn-system-request': 'true', Cookie: sessionCookie },
    });
    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.expiresInMs).toBe('number');
    expect(response.body.canBeExtended).toBe(true);
    expect(response.body.provider).toStrictEqual({ type: 'basic', name: 'basic1' });
  });

  test('GET /internal/security/session should not extend the session', async ({ apiClient }) => {
    const r1 = await apiClient.get('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, 'kbn-system-request': 'true', Cookie: sessionCookie },
    });
    expect(r1).toHaveStatusCode(200);
    const r2 = await apiClient.get('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, 'kbn-system-request': 'true', Cookie: sessionCookie },
    });
    expect(r2).toHaveStatusCode(200);
    expect(r2.body.expiresInMs).toBeLessThan(r1.body.expiresInMs);
  });

  test('POST /internal/security/session should redirect to GET', async ({ apiClient }) => {
    const response = await apiClient.post('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, Cookie: sessionCookie },
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/internal/security/session');
  });

  test('POST /internal/security/session should extend the session', async ({
    apiClient,
    esClient,
  }) => {
    const allCreatedAtBefore = await getSessionsCreatedAt(esClient);
    expect(allCreatedAtBefore.every((value) => value > 0)).toBe(true);

    await apiClient.get('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, 'kbn-system-request': 'true', Cookie: sessionCookie },
    });

    const extendResponse = await apiClient.post('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, Cookie: sessionCookie },
    });
    expect(extendResponse.statusCode).toBe(302);

    if (extendResponse.headers['set-cookie']) {
      sessionCookie = extractSessionCookie(extendResponse.headers['set-cookie']);
    }

    const afterExtend = Date.now();
    const getResponse = await apiClient.get('/internal/security/session', {
      headers: { ...SESSION_API_HEADERS, 'kbn-system-request': 'true', Cookie: sessionCookie },
    });
    expect(getResponse).toHaveStatusCode(200);
    const getOverhead = Date.now() - afterExtend;

    expect(getResponse.body.expiresInMs).toBeGreaterThan(IDLE_TIMEOUT_MS - getOverhead - 100);
    expect(getResponse.body.expiresInMs).toBeLessThan(IDLE_TIMEOUT_MS + 100);

    const allCreatedAtAfter = await getSessionsCreatedAt(esClient);
    expect(allCreatedAtAfter).toStrictEqual(allCreatedAtBefore);
  });
});
