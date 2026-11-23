/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';

import { tags, apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const TEST_USERNAME = `session_id_test_${randomUUID()}`;
const TEST_PASSWORD = 'changeme';
const PROVIDER = { type: 'basic', name: 'cloud-basic' } as const;
const SESSION_API_HEADERS = {
  'kbn-xsrf': 'xxx',
  'x-elastic-internal-origin': 'kibana',
} as const;

test.describe('Session IDs', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putUser({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      roles: ['kibana_admin'],
      full_name: 'Session ID Test',
    });
  });

  test.afterAll(async ({ apiClient, config, esClient }) => {
    try {
      const authorization = `Basic ${Buffer.from(
        `${config.auth.username}:${config.auth.password}`
      ).toString('base64')}`;
      const response = await apiClient.post('/api/security/session/_invalidate', {
        headers: { ...SESSION_API_HEADERS, Authorization: authorization },
        body: { match: 'query', query: { provider: PROVIDER, username: TEST_USERNAME } },
      });
      expect(response).toHaveStatusCode(200);
    } finally {
      await esClient.security.deleteUser({ username: TEST_USERNAME }, { ignore: [404] });
    }
  });

  test('creates a URL-safe document ID and keeps the session usable', async ({
    apiClient,
    esClient,
  }) => {
    const loginResponse = await apiClient.post('/internal/security/login', {
      headers: SESSION_API_HEADERS,
      body: {
        providerType: PROVIDER.type,
        providerName: PROVIDER.name,
        currentURL: '/',
        params: { username: TEST_USERNAME, password: TEST_PASSWORD },
      },
    });
    expect(loginResponse).toHaveStatusCode(200);
    const setCookies = loginResponse.headers['set-cookie'];
    const cookie = (Array.isArray(setCookies) ? setCookies : [setCookies])
      .find((setCookie) => setCookie?.startsWith('sid='))
      ?.split(';', 1)[0];
    expect(cookie).toMatch(/^sid=/);

    const meResponse = await apiClient.get('/internal/security/me', {
      headers: { ...SESSION_API_HEADERS, Cookie: cookie ?? '' },
    });
    expect(meResponse).toHaveStatusCode(200);
    expect(meResponse.body.username).toBe(TEST_USERNAME);
    expect(meResponse.body.authentication_provider).toMatchObject(PROVIDER);

    const usernameHash = createHash('sha3-256').update(TEST_USERNAME).digest('hex');
    let sid = '';
    await expect
      .poll(async () => {
        const result = await esClient.search({
          index: '.kibana_security_session*',
          ignore_unavailable: true,
          expand_wildcards: 'all',
          query: { term: { usernameHash } },
        });
        sid = result.hits.hits[0]?._id ?? '';
        return sid;
      })
      .toMatch(/^[A-Za-z0-9_-]{43}$/);

    expect(Buffer.from(sid, 'base64url')).toHaveLength(32);
  });
});
