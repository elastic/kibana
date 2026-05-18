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

const unsnoozeUrl = (groupHash: string) =>
  `${ALERT_API_PATH}/${encodeURIComponent(groupHash)}/_unsnooze`;

apiTest.describe('Create unsnooze alert action API', { tag: '@local-stateful-classic' }, () => {
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
    'happy path: writes an unsnooze action and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'unsnooze-happy-rule';
      const groupHash = 'unsnooze-happy-group';

      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'unsnooze-happy-episode', status: 'active' },
        },
      ]);

      const response = await apiClient.post(unsnoozeUrl(groupHash), {
        headers: writerHeaders,
        body: {},
      });

      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActions.findActions([ruleId]);
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'unsnooze',
        group_hash: groupHash,
        rule_id: ruleId,
        space_id: 'default',
      });
    }
  );

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(unsnoozeUrl('any-group'), {
      headers: writerHeaders,
      body: { extra: 'nope' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(unsnoozeUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: {},
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(unsnoozeUrl('unknown-group'), {
      headers: writerHeaders,
      body: {},
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const ruleId = 'unsnooze-authz-read-rule';
      const groupHash = 'unsnooze-authz-read-group';

      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'unsnooze-authz-read-episode', status: 'active' },
        },
      ]);

      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await apiClient.post(unsnoozeUrl(groupHash), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: {},
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const ruleId = 'unsnooze-authz-none-rule';
      const groupHash = 'unsnooze-authz-none-group';

      await apiServices.alertingV2.alertActions.seedEvents([
        {
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'unsnooze-authz-none-episode', status: 'active' },
        },
      ]);

      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(unsnoozeUrl(groupHash), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: {},
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
