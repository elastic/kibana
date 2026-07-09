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
  getSnoozeAlertActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Create snooze alert action API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.alertActionsEvents.cleanUp();
  });

  apiTest(
    'snooze: writes a snooze action with expiry and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-happy-rule';
      const groupHash = 'snooze-happy-group';
      const expiry = '2099-01-01T00:00:00.000Z';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'snooze-happy-episode', status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getSnoozeAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { expiry },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHash,
        rule_id: ruleId,
        space_id: 'default',
        expiry,
      });
    }
  );

  apiTest(
    'snooze: writes a snooze action without expiry and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'snooze-no-expiry-rule';
      const groupHash = 'snooze-no-expiry-group';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'snooze-no-expiry-episode', status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getSnoozeAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['snooze'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'snooze',
        group_hash: groupHash,
        rule_id: ruleId,
      });
      expect(actions[0].expiry).toBeUndefined();
    }
  );

  apiTest('schema: rejects expiry that is not ISO 8601 with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { expiry: 'not-a-date' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects expiry without the time component with 400', async ({ apiClient }) => {
    // `z.iso.datetime()` requires a full ISO 8601 datetime; a date-only value
    // like `2099-01-01` should be rejected.
    const response = await apiClient.post(getSnoozeAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { expiry: '2099-01-01' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeAlertActionUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getSnoozeAlertActionUrl('unknown-group'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(getSnoozeAlertActionUrl('snooze-authz-read-group'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: {},
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getSnoozeAlertActionUrl('snooze-authz-none-group'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: {},
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
