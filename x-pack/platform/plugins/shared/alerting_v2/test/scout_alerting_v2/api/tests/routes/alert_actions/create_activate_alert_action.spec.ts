/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALL_ROLE, apiTest, NO_ACCESS_ROLE, READ_ROLE, testData } from '../../../fixtures';

const ALERT_API_PATH = '/api/alerting/v2/alerts';

const activateUrl = (groupHash: string) =>
  `${ALERT_API_PATH}/${encodeURIComponent(groupHash)}/_activate`;

apiTest.describe('Create activate alert action API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActions.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.alertActions.cleanUp();
  });

  apiTest(
    'activate: writes an activate action and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-happy-rule';
      const groupHash = 'activate-happy-group';
      const reason = 'needs immediate attention';
      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'activate-happy-episode', status: 'active' },
        },
      ]);
      const response = await apiClient.post(activateUrl(groupHash), {
        headers: writerHeaders,
        body: { reason },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActions.findActions([ruleId]);
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'activate',
        group_hash: groupHash,
        rule_id: ruleId,
        space_id: 'default',
        reason,
      });
    }
  );

  apiTest('schema: rejects body missing reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('any-group'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects empty reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: '' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects reason over 1024 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'a'.repeat(1025) },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'valid', extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(activateUrl('unknown-group'), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const ruleId = 'activate-authz-read-rule';
      const groupHash = 'activate-authz-read-group';
      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'activate-authz-read-episode', status: 'active' },
        },
      ]);
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
      const response = await apiClient.post(activateUrl(groupHash), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { reason: 'valid reason' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const ruleId = 'activate-authz-none-rule';
      const groupHash = 'activate-authz-none-group';
      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'activate-authz-none-episode', status: 'active' },
        },
      ]);
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(activateUrl(groupHash), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { reason: 'valid reason' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
