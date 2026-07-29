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
  getAssignAlertActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Create assign alert action API', { tag: '@local-stateful-classic' }, () => {
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
    'assign: writes an assign action with assignee_uid and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-happy-rule';
      const groupHash = 'assign-happy-group';
      const episodeId = 'assign-happy-episode';
      const assigneeUid = 'u_user_profile_uid_123';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getAssignAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { episode_id: episodeId, assignee_uid: assigneeUid },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'assign',
        group_hash: groupHash,
        episode_id: episodeId,
        rule_id: ruleId,
        space_id: 'default',
        assignee_uid: assigneeUid,
      });
    }
  );

  apiTest(
    'assign: null assignee_uid clears the assignee and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-clear-rule';
      const groupHash = 'assign-clear-group';
      const episodeId = 'assign-clear-episode';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getAssignAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { episode_id: episodeId, assignee_uid: null },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'assign',
        group_hash: groupHash,
        episode_id: episodeId,
        rule_id: ruleId,
        assignee_uid: null,
      });
    }
  );

  apiTest('schema: rejects body missing episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects body missing assignee_uid with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects empty episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: '', assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects episode_id over 150 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'a'.repeat(151), assignee_uid: 'u_someone' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects assignee_uid over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode', assignee_uid: 'a'.repeat(257) },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'schema: rejects assignee_uid that is neither string nor null with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
        headers: writerHeaders,
        body: { episode_id: 'some-episode', assignee_uid: 42 },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode', assignee_uid: 'u_someone', extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: { episode_id: 'some-episode', assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignAlertActionUrl('unknown-group'), {
      headers: writerHeaders,
      body: { episode_id: 'unknown-episode', assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ALERT_EVENT_NOT_FOUND');
  });

  apiTest(
    'returns 404 when episode_id matches no events for the group',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-404-rule';
      const groupHash = 'assign-404-group';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'real-episode', status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getAssignAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { episode_id: 'unknown-episode', assignee_uid: 'u_someone' },
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('ALERT_EVENT_NOT_FOUND');
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(getAssignAlertActionUrl('assign-authz-read-group'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { episode_id: 'assign-authz-read-episode', assignee_uid: 'u_someone' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getAssignAlertActionUrl('assign-authz-none-group'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { episode_id: 'assign-authz-none-episode', assignee_uid: 'u_someone' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
