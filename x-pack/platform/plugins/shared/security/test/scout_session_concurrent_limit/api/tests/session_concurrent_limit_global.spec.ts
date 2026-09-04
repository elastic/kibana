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
  disableSessionAuthcDebugLogs,
  enableSessionAuthcDebugLogs,
  ensureSessionIndexReady,
  getSessionCount,
  invalidateAllSessions,
  LOCAL_STATEFUL_TAGS,
  loginWithAnonymous,
  loginWithBasic,
  loginWithSAML,
  putNativeUser,
  refreshSessionIndex,
  SESSION_API_HEADERS,
  toggleSessionCleanupTask,
} from '../../../session_management/helpers';

const TEST_USERNAME = 'concurrent_test_user';
const TEST_PASSWORD = 'changeme';
const ANONYMOUS_USERNAME = 'anonymous_user';
const ANONYMOUS_PASSWORD = 'changeme';

test.describe('Session Concurrent Limit global', { tag: [...LOCAL_STATEFUL_TAGS] }, () => {
  test.beforeAll(async ({ apiClient, config, esClient }) => {
    await putNativeUser(
      esClient,
      TEST_USERNAME,
      TEST_PASSWORD,
      ['kibana_admin'],
      'Concurrent Test User'
    );
    await putNativeUser(esClient, ANONYMOUS_USERNAME, ANONYMOUS_PASSWORD, [], 'Guest');
    await toggleSessionCleanupTask(apiClient, config, false);
  });

  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await refreshSessionIndex(apiClient, config);
    await ensureSessionIndexReady(esClient);
    await enableSessionAuthcDebugLogs(esClient);
    await invalidateAllSessions(apiClient, config);
    await expect.poll(async () => getSessionCount(esClient), { timeout: 15000 }).toBe(0);
  });

  test.afterAll(async ({ apiClient, config, esClient }) => {
    await toggleSessionCleanupTask(apiClient, config, true);
    await disableSessionAuthcDebugLogs(esClient);
    await deleteNativeUser(esClient, TEST_USERNAME);
    await deleteNativeUser(esClient, ANONYMOUS_USERNAME);
  });

  test('should properly enforce session limit with single provider', async ({
    apiClient,
    config,
  }) => {
    const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const meOne = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieOne },
    });
    expect(meOne.body.username).toBe(TEST_USERNAME);

    const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const me1a = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieOne },
    });
    expect(me1a.body.username).toBe(TEST_USERNAME);
    const me2a = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieTwo },
    });
    expect(me2a.body.username).toBe(TEST_USERNAME);

    const cookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await refreshSessionIndex(apiClient, config);
    const ex1 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieOne },
    });
    expect(ex1).toHaveStatusCode(401);
    const ok2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieTwo },
    });
    expect(ok2.body.username).toBe(TEST_USERNAME);
    const ok3 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieThree },
    });
    expect(ok3.body.username).toBe(TEST_USERNAME);

    const cookieFour = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await refreshSessionIndex(apiClient, config);
    const ex2 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieTwo },
    });
    expect(ex2).toHaveStatusCode(401);
    const ok3b = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieThree },
    });
    expect(ok3b.body.username).toBe(TEST_USERNAME);
    const ok4 = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookieFour },
    });
    expect(ok4.body.username).toBe(TEST_USERNAME);
  });

  test('should properly enforce session limit with single provider and multiple users', async ({
    apiClient,
    config,
  }) => {
    const c1 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const c2 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const c3 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    const c4 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);

    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c1 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c2 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c3 },
        })
      ).body.username
    ).toBe(config.auth.username);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c4 },
        })
      ).body.username
    ).toBe(config.auth.username);

    const c5 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    await refreshSessionIndex(apiClient, config);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c1 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c2 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: c3 },
      })
    ).toHaveStatusCode(401);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c4 },
        })
      ).body.username
    ).toBe(config.auth.username);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c5 },
        })
      ).body.username
    ).toBe(config.auth.username);

    const c6 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    await refreshSessionIndex(apiClient, config);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c1 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c2 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: c4 },
      })
    ).toHaveStatusCode(401);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c5 },
        })
      ).body.username
    ).toBe(config.auth.username);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c6 },
        })
      ).body.username
    ).toBe(config.auth.username);

    const c7 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await refreshSessionIndex(apiClient, config);
    expect(
      await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: c1 },
      })
    ).toHaveStatusCode(401);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c2 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c5 },
        })
      ).body.username
    ).toBe(config.auth.username);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c6 },
        })
      ).body.username
    ).toBe(config.auth.username);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: c7 },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
  });

  test('should properly enforce session limit even for multiple concurrent logins', async ({
    apiClient,
    config,
  }) => {
    const cookies = await Promise.all(
      Array.from({ length: 10 }).map(() => loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD))
    );

    const statusCodes: number[] = [];
    for (const cookie of cookies) {
      await refreshSessionIndex(apiClient, config);
      const response = await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: cookie },
      });
      statusCodes.push(response.statusCode);
    }

    expect(statusCodes.filter((status) => status === 200)).toHaveLength(2);
    expect(statusCodes.filter((status) => status === 401)).toHaveLength(8);
  });

  test('should properly enforce session limit with multiple providers', async ({
    apiClient,
    config,
  }) => {
    const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookieOne = await loginWithSAML(apiClient, config);
    const samlCookieTwo = await loginWithSAML(apiClient, config);

    await refreshSessionIndex(apiClient, config);

    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieOne },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieTwo },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieOne },
        })
      ).body.username
    ).toBe('a@b.c');
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
        })
      ).body.username
    ).toBe('a@b.c');

    const samlCookieThree = await loginWithSAML(apiClient, config);
    await refreshSessionIndex(apiClient, config);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieOne },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieTwo },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: samlCookieOne },
      })
    ).toHaveStatusCode(401);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
        })
      ).body.username
    ).toBe('a@b.c');
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieThree },
        })
      ).body.username
    ).toBe('a@b.c');

    const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    await refreshSessionIndex(apiClient, config);
    expect(
      await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: basicCookieOne },
      })
    ).toHaveStatusCode(401);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieTwo },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: basicCookieThree },
        })
      ).body.username
    ).toBe(TEST_USERNAME);
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieTwo },
        })
      ).body.username
    ).toBe('a@b.c');
    expect(
      (
        await apiClient.get('/internal/security/me', {
          headers: { ...SESSION_API_HEADERS, Cookie: samlCookieThree },
        })
      ).body.username
    ).toBe('a@b.c');
  });

  test('should not enforce session limit for anonymous users', async ({ apiClient, config }) => {
    for (const _ of [0, 1, 2, 3]) {
      const cookie = await loginWithAnonymous(apiClient);
      await refreshSessionIndex(apiClient, config);
      const response = await apiClient.get('/internal/security/me', {
        headers: { ...SESSION_API_HEADERS, Cookie: cookie },
      });
      expect(response.body.username).toBe(ANONYMOUS_USERNAME);
    }
  });
});
