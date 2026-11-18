/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';

import { tags, apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  assertSessionCookie,
  deleteNativeUser,
  invalidateMatchingSessions,
  loginWithBasic,
  putNativeUser,
} from '../../../scout_session_management/helpers';

const TEST_USERNAME = `session_id_test_${randomUUID()}`;
const TEST_PASSWORD = 'changeme';
const PROVIDER = { type: 'basic', name: 'cloud-basic' } as const;

test.describe('Session IDs', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await putNativeUser(
      esClient,
      TEST_USERNAME,
      TEST_PASSWORD,
      ['kibana_admin'],
      'Session ID Test'
    );
  });

  test.afterAll(async ({ apiClient, config, esClient }) => {
    await invalidateMatchingSessions(apiClient, config, {
      provider: PROVIDER,
      username: TEST_USERNAME,
    });
    await deleteNativeUser(esClient, TEST_USERNAME);
  });

  test('creates a URL-safe document ID and keeps the session usable', async ({
    apiClient,
    esClient,
  }) => {
    const cookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD, PROVIDER.name);
    await assertSessionCookie(apiClient, cookie, TEST_USERNAME, PROVIDER);

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
