/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  FEATURE_PRIVILEGED_ROLE,
  FEATURE_READ_ROLE,
  NO_INFERENCE_PRIVILEGE_ROLE,
  INFERENCE_FEATURES_API_PATH,
} from '../constants';

const TEST_PREFIX = 'inference-features-authz';

const toBasicAuthHeader = (username: string, password: string): Record<string, string> => {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
};

apiTest.describe('Inference features authorization', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  const testRunId = randomUUID();

  const allUser = {
    roleName: `${TEST_PREFIX}-all-role-${testRunId}`,
    username: `${TEST_PREFIX}-all-user-${testRunId}`,
    password: 'all-user-password',
  };
  const readUser = {
    roleName: `${TEST_PREFIX}-read-role-${testRunId}`,
    username: `${TEST_PREFIX}-read-user-${testRunId}`,
    password: 'read-user-password',
  };
  const noPrivUser = {
    roleName: `${TEST_PREFIX}-no-priv-role-${testRunId}`,
    username: `${TEST_PREFIX}-no-priv-user-${testRunId}`,
    password: 'no-priv-user-password',
  };

  const testHeaders = (username: string, password: string) => ({
    ...COMMON_HEADERS,
    ...toBasicAuthHeader(username, password),
  });

  apiTest.beforeAll(async ({ kbnClient }) => {
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${encodeURIComponent(allUser.roleName)}`,
      body: FEATURE_PRIVILEGED_ROLE,
    });
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${encodeURIComponent(readUser.roleName)}`,
      body: FEATURE_READ_ROLE,
    });
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${encodeURIComponent(noPrivUser.roleName)}`,
      body: NO_INFERENCE_PRIVILEGE_ROLE,
    });

    for (const user of [allUser, readUser, noPrivUser]) {
      await kbnClient.request({
        method: 'POST',
        path: `/internal/security/users/${encodeURIComponent(user.username)}`,
        body: {
          username: user.username,
          password: user.password,
          roles: [user.roleName],
          full_name: user.username,
          enabled: true,
        },
      });
    }
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    for (const user of [allUser, readUser, noPrivUser]) {
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/internal/security/users/${encodeURIComponent(user.username)}`,
        })
        .catch(() => {});
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/security/role/${encodeURIComponent(user.roleName)}`,
        })
        .catch(() => {});
    }
  });

  apiTest('feature-privileged user can GET features', async ({ apiClient }) => {
    const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
      headers: testHeaders(allUser.username, allUser.password),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.features).toBeDefined();
  });

  apiTest('read-privileged user can GET features', async ({ apiClient }) => {
    const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
      headers: testHeaders(readUser.username, readUser.password),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.features).toBeDefined();
  });

  apiTest('user with no inference privilege gets 403 on GET features', async ({ apiClient }) => {
    const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
      headers: testHeaders(noPrivUser.username, noPrivUser.password),
    });

    expect(response).toHaveStatusCode(403);
  });
});
