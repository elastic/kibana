/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  buildAlertEvent,
  getAssignEpisodeActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Create assign episode action API', { tag: '@local-stateful-classic' }, () => {
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
          alert: { id: episodeId, status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: assigneeUid },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(1);
      // The group_hash is resolved server-side from the episode's events.
      expect(actions[0]).toMatchObject({
        action_type: 'assign',
        group_hash: groupHash,
        alert_id: episodeId,
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
          alert: { id: episodeId, status: 'active' },
        }),
      ]);
      const assignResponse = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: 'u_assigned_first' },
      });
      expect(assignResponse).toHaveStatusCode(204);

      const response = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: null },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(2);
      expect(actions[1]).toMatchObject({
        action_type: 'assign',
        group_hash: groupHash,
        alert_id: episodeId,
        rule_id: ruleId,
        assignee_uid: null,
      });
    }
  );

  apiTest(
    'assign: repeating the current assignee returns 409 and writes no second action',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-no-op-rule';
      const groupHash = 'assign-no-op-group';
      const episodeId = 'assign-no-op-episode';
      const assigneeUid = 'u_already_assigned';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: episodeId, status: 'active' },
        }),
      ]);
      const firstResponse = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: assigneeUid },
      });
      expect(firstResponse).toHaveStatusCode(204);

      const response = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: assigneeUid },
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('ALERT_ACTION_NO_OP');
      expect(response.body.details).toMatchObject({
        alert_id: episodeId,
        group_hash: groupHash,
        action_type: 'assign',
      });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(1);
    }
  );

  apiTest(
    'assign: clearing the assignee of an unassigned alert returns 409',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-clear-no-op-rule';
      const groupHash = 'assign-clear-no-op-group';
      const episodeId = 'assign-clear-no-op-episode';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: null },
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('ALERT_ACTION_NO_OP');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'assign: reinstating a cleared assignee returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'assign-reinstate-rule';
      const groupHash = 'assign-reinstate-group';
      const episodeId = 'assign-reinstate-episode';
      const assigneeUid = 'u_reinstated';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: episodeId, status: 'active' },
        }),
      ]);

      for (const body of [{ assignee_uid: assigneeUid }, { assignee_uid: null }]) {
        const setupResponse = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
          headers: writerHeaders,
          body,
        });
        expect(setupResponse).toHaveStatusCode(204);
      }

      const response = await apiClient.post(getAssignEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { assignee_uid: assigneeUid },
      });
      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['assign'],
      });
      expect(actions).toHaveLength(3);
      expect(actions[2]).toMatchObject({ assignee_uid: assigneeUid });
    }
  );

  apiTest(
    'assign: audit actions work on old (superseded) episodes',
    async ({ apiClient, apiServices }) => {
      // Two episodes for the same series: the older one closed, a newer one
      // is active. Assign is a pure audit record, so assigning the OLDER
      // episode must succeed and the persisted doc must carry the older
      // episode id.
      const ruleId = 'assign-old-episode-rule';
      const groupHash = 'assign-old-episode-group';
      const olderEpisodeId = 'assign-old-episode-older';
      const newerEpisodeId = 'assign-old-episode-newer';
      const now = Date.now();

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': new Date(now - 60_000).toISOString(),
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          alert: { id: olderEpisodeId, status: 'inactive' },
        }),
        buildAlertEvent({
          '@timestamp': new Date(now).toISOString(),
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          alert: { id: newerEpisodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(getAssignEpisodeActionUrl(olderEpisodeId), {
        headers: writerHeaders,
        body: { assignee_uid: 'u_someone' },
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
        alert_id: olderEpisodeId,
        assignee_uid: 'u_someone',
      });
    }
  );

  apiTest('schema: rejects body missing assignee_uid with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects alert_id in the body (strict mode) with 400', async ({ apiClient }) => {
    // The episode id moved to the path; the assign body only carries the
    // assignee.
    const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { alert_id: 'any-episode', assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    `schema: rejects assignee_uid over ${ID_MAX_LENGTH} chars with 400`,
    async ({ apiClient }) => {
      const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
        headers: writerHeaders,
        body: { assignee_uid: 'a'.repeat(ID_MAX_LENGTH + 1) },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects an empty assignee_uid with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { assignee_uid: '' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects assignee_uid that is neither string nor null with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
        headers: writerHeaders,
        body: { assignee_uid: 42 },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { assignee_uid: 'u_someone', extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects alert_id over 150 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignEpisodeActionUrl('a'.repeat(151)), {
      headers: writerHeaders,
      body: { assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('returns 404 when alert_id matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getAssignEpisodeActionUrl('unknown-episode'), {
      headers: writerHeaders,
      body: { assignee_uid: 'u_someone' },
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ALERT_NOT_FOUND');
    expect(response.body.details).toMatchObject({ alert_id: 'unknown-episode' });
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(
        getAssignEpisodeActionUrl('assign-authz-read-episode'),
        {
          headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
          body: { assignee_uid: 'u_someone' },
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
        getAssignEpisodeActionUrl('assign-authz-none-episode'),
        {
          headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
          body: { assignee_uid: 'u_someone' },
        }
      );
      expect(response).toHaveStatusCode(403);
    }
  );
});
