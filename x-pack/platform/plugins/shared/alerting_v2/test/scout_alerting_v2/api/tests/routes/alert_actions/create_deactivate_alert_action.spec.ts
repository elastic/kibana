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
  getDeactivateAlertActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Create deactivate alert action API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest(
    'deactivate: writes a deactivate action and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'deactivate-happy-rule';
      const groupHash = 'deactivate-happy-group';
      const reason = 'no longer relevant';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'deactivate-happy-episode', status: 'active' },
        }),
      ]);

      const response = await apiClient.post(getDeactivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason },
      });

      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['deactivate'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'deactivate',
        group_hash: groupHash,
        rule_id: ruleId,
        space_id: 'default',
        reason,
      });
    }
  );

  apiTest('schema: rejects body missing reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: {},
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects empty reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: '' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects reason over 1024 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'a'.repeat(1025) },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'valid', extra: 'nope' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getDeactivateAlertActionUrl('unknown-group'), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );

      const response = await apiClient.post(
        getDeactivateAlertActionUrl('deactivate-authz-read-group'),
        {
          headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
          body: { reason: 'valid reason' },
        }
      );

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(
        getDeactivateAlertActionUrl('deactivate-authz-none-group'),
        {
          headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
          body: { reason: 'valid reason' },
        }
      );

      expect(response).toHaveStatusCode(403);
    }
  );
});
