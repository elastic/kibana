/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  deleteNativeUser,
  enableSessionAuthcDebugLogs,
  ensureSessionIndexReady,
  finishSAMLHandshake,
  getSessionCount,
  invalidateAllSessions,
  LOCAL_STATEFUL_TAGS,
  loginWithAnonymous,
  loginWithBasic,
  loginWithSAML,
  putNativeUser,
  refreshSessionIndex,
  removeSessionCreatedAt,
  runCleanupTask,
  SESSION_API_HEADERS,
  startSAMLHandshake,
} from '../../../session_management/helpers';

const TEST_USERNAME = 'concurrent_test_user';
const TEST_PASSWORD = 'changeme';
const ANONYMOUS_USERNAME = 'anonymous_user';
const ANONYMOUS_PASSWORD = 'changeme';

test.describe('Session Concurrent Limit cleanup', { tag: [...LOCAL_STATEFUL_TAGS] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await putNativeUser(
      esClient,
      TEST_USERNAME,
      TEST_PASSWORD,
      ['kibana_admin'],
      'Concurrent Test User'
    );
    await putNativeUser(esClient, ANONYMOUS_USERNAME, ANONYMOUS_PASSWORD, [], 'Guest');
  });

  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await ensureSessionIndexReady(esClient);
    await enableSessionAuthcDebugLogs(esClient);
    await invalidateAllSessions(apiClient, config);
  });

  test.afterAll(async ({ esClient }) => {
    await deleteNativeUser(esClient, TEST_USERNAME);
    await deleteNativeUser(esClient, ANONYMOUS_USERNAME);
  });

  test('should properly clean up sessions that exceeded concurrent session limit', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(100000);

    const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const cookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(3);

    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(2);

    const r1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieOne },
    });
    expect(r1).toHaveStatusCode(401);

    const r2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieTwo },
    });
    expect(r2.body.username).toBe(TEST_USERNAME);

    const r3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieThree },
    });
    expect(r3.body.username).toBe(TEST_USERNAME);
  });

  test('should properly clean up sessions that exceeded concurrent session limit even for multiple providers', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(160000);

    const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(1);

    const samlCookieOne = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(2);

    const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(3);

    const samlCookieTwo = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(4);

    const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(5);

    const samlCookieThree = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(6);

    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(4);

    const b1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieOne },
    });
    expect(b1).toHaveStatusCode(401);

    const b2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieTwo },
    });
    expect(b2.body.username).toBe(TEST_USERNAME);

    const b3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieThree },
    });
    expect(b3.body.username).toBe(TEST_USERNAME);

    const s1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieOne },
    });
    expect(s1).toHaveStatusCode(401);

    const s2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
    });
    expect(s2.body.username).toBe('a@b.c');

    const s3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieThree },
    });
    expect(s3.body.username).toBe('a@b.c');
  });

  test('should properly clean up sessions that exceeded concurrent session limit when legacy sessions are present', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(100000);

    const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(1);

    const samlCookieOne = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(2);

    const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(3);

    const samlCookieTwo = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(4);

    const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(5);

    const samlCookieThree = await loginWithSAML(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(6);

    const aggResponse = await esClient.search({
      index: '.kibana_security_session*',
      size: 0,
      expand_wildcards: 'all',
      ignore_unavailable: true,
      filter_path: 'aggregations.sessions.buckets.top.hits.hits._id',
      aggs: {
        sessions: {
          multi_terms: { terms: [{ field: 'usernameHash' }, { field: 'provider.type' }] },
          aggs: {
            top: { top_hits: { sort: [{ createdAt: { order: 'desc' as const } }], size: 1 } },
          },
        },
      },
    });

    const buckets =
      (
        aggResponse.aggregations as
          | {
              sessions?: {
                buckets?: Array<{ top?: { hits?: { hits?: Array<{ _id?: string }> } } }>;
              };
            }
          | undefined
      )?.sessions?.buckets ?? [];
    const sessionIds = buckets.flatMap((bucket) => {
      const id = bucket.top?.hits?.hits?.[0]?._id;
      return id ? [id] : [];
    });
    expect(sessionIds).toHaveLength(2);

    await removeSessionCreatedAt(apiClient, config, sessionIds);
    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(4);

    const b1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieOne },
    });
    expect(b1.body.username).toBe(TEST_USERNAME);

    const b2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieTwo },
    });
    expect(b2.body.username).toBe(TEST_USERNAME);

    const b3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: basicCookieThree },
    });
    expect(b3).toHaveStatusCode(401);

    const s1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieOne },
    });
    expect(s1.body.username).toBe('a@b.c');

    const s2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
    });
    expect(s2.body.username).toBe('a@b.c');

    const s3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieThree },
    });
    expect(s3).toHaveStatusCode(401);
  });

  test('should not clean up session if the limit is not exceeded', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(100000);

    const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(2);

    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(2);

    const r1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieOne },
    });
    expect(r1.body.username).toBe(TEST_USERNAME);

    const r2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieTwo },
    });
    expect(r2.body.username).toBe(TEST_USERNAME);
  });

  test('should not clean up sessions of the anonymous users', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(100000);

    const cookieOne = await loginWithAnonymous(apiClient);
    const cookieTwo = await loginWithAnonymous(apiClient);
    const cookieThree = await loginWithAnonymous(apiClient);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(3);

    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(3);

    for (const cookie of [cookieOne, cookieTwo, cookieThree]) {
      const response = await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: cookie },
      });
      expect(response.body.username).toBe(ANONYMOUS_USERNAME);
    }
  });

  test('should not clean up unauthenticated sessions', async ({ apiClient, config, esClient }) => {
    test.setTimeout(100000);

    const handshakeOne = await startSAMLHandshake(apiClient);
    const handshakeTwo = await startSAMLHandshake(apiClient);
    const handshakeThree = await startSAMLHandshake(apiClient);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 20000 }).toBe(3);

    await runCleanupTask(apiClient, config);

    await expect.poll(async () => getSessionCount(esClient), { timeout: 30000 }).toBe(3);

    const samlCookieOne = await finishSAMLHandshake(
      apiClient,
      config,
      handshakeOne.cookie,
      handshakeOne.location
    );
    const samlCookieTwo = await finishSAMLHandshake(
      apiClient,
      config,
      handshakeTwo.cookie,
      handshakeTwo.location
    );
    const samlCookieThree = await finishSAMLHandshake(
      apiClient,
      config,
      handshakeThree.cookie,
      handshakeThree.location
    );

    await refreshSessionIndex(apiClient, config);

    const s1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieOne },
    });
    expect(s1).toHaveStatusCode(401);

    const s2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
    });
    expect(s2.body.username).toBe('a@b.c');

    const s3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: samlCookieThree },
    });
    expect(s3.body.username).toBe('a@b.c');
  });
});
