/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  buildAlertEvent,
  getAckAlertActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

/*
 * Authorization tests below use `requestAuth.getApiKeyForCustomRole`, which
 * is not yet supported on Elastic Cloud Hosted (custom roles fall back to
 * `viewer`). Restrict the suite to local stateful (classic) until ECH lands.
 */

apiTest.describe('Create ack alert action API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActions.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActions.cleanUp();
  });

  apiTest('ack: writes an ack action and returns 204', async ({ apiClient, apiServices }) => {
    const ruleId = 'ack-happy-rule';
    const groupHash = 'ack-happy-group';
    const episodeId = 'ack-happy-episode';
    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
      }),
    ]);
    const response = await apiClient.post(getAckAlertActionUrl(groupHash), {
      headers: writerHeaders,
      body: { episode_id: episodeId },
    });
    expect(response).toHaveStatusCode(204);
    const actions = await apiServices.alertingV2.alertActions.find({
      ruleId,
      actionTypes: ['ack'],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action_type: 'ack',
      group_hash: groupHash,
      episode_id: episodeId,
      rule_id: ruleId,
      space_id: 'default',
    });
  });

  apiTest('schema: rejects body missing episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects empty episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: '' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects episode_id over 150 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'a'.repeat(151) },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode', extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getAckAlertActionUrl('unknown-group'), {
      headers: writerHeaders,
      body: { episode_id: 'unknown-episode' },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'returns 404 when episode_id matches no events for the group',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'ack-404-rule';
      const groupHash = 'ack-404-group';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'real-episode', status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getAckAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { episode_id: 'unknown-episode' },
      });
      expect(response).toHaveStatusCode(404);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(getAckAlertActionUrl('ack-authz-read-group'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { episode_id: 'ack-authz-read-episode' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getAckAlertActionUrl('ack-authz-none-group'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { episode_id: 'ack-authz-none-episode' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
