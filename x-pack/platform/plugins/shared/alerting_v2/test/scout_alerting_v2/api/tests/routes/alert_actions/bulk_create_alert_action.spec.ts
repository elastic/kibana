/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import type { AlertAction } from '../../../../../../server/resources/datastreams/alert_actions';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  buildAlertEvent,
  BULK_ALERT_ACTION_URL,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const buildAuditAction = (input: {
  ruleId: string;
  groupHash: string;
  episodeId: string;
  actionType: AlertAction['action_type'];
  reason?: string;
  timestamp: string;
}): AlertAction => ({
  '@timestamp': input.timestamp,
  actor: 'elastic',
  action_type: input.actionType,
  last_series_event_timestamp: input.timestamp,
  rule_id: input.ruleId,
  group_hash: input.groupHash,
  episode_id: input.episodeId,
  space_id: 'default',
  ...(input.reason ? { reason: input.reason } : {}),
});

/** Returns ISO timestamps separated by `stepMs`, ordered earliest first. */
const buildTimestampSequence = (stepMs: number, count: number): string[] => {
  const baseMs = Date.now() - stepMs * count;
  return Array.from({ length: count }, (_, i) => new Date(baseMs + i * stepMs).toISOString());
};

apiTest.describe('Bulk create alert actions API', { tag: '@local-stateful-classic' }, () => {
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
    'bulk: processes a single valid item and returns counts',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-single-rule';
      const groupHash = 'bulk-single-group';
      const episodeId = 'bulk-single-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: groupHash, action_type: 'ack', episode_id: episodeId }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 1, total: 1 });

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
      });
    }
  );

  apiTest(
    'bulk: processes mixed (non-lifecycle) action types and persists each side effect',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-mixed-rule';
      const groupHashTag = 'bulk-mixed-group-tag';
      const groupHashSnooze = 'bulk-mixed-group-snooze';
      const groupHashAck = 'bulk-mixed-group-ack';
      const ackEpisodeId = 'bulk-mixed-ack-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashTag,
          episode: { id: 'bulk-mixed-tag-episode', status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashSnooze,
          episode: { id: 'bulk-mixed-snooze-episode', status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashAck,
          episode: { id: ackEpisodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: groupHashTag, action_type: 'tag', tags: ['important', 'reviewed'] },
          { group_hash: groupHashSnooze, action_type: 'snooze', expiry: '2099-01-01T00:00:00Z' },
          { group_hash: groupHashAck, action_type: 'ack', episode_id: ackEpisodeId },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 3, total: 3 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['tag', 'snooze', 'ack'],
      });
      expect(actions).toHaveLength(3);

      const tagAction = actions.find((doc) => doc.action_type === 'tag');
      const snoozeAction = actions.find((doc) => doc.action_type === 'snooze');
      const ackAction = actions.find((doc) => doc.action_type === 'ack');

      expect(tagAction).toMatchObject({
        group_hash: groupHashTag,
        tags: ['important', 'reviewed'],
      });
      expect(snoozeAction).toMatchObject({
        group_hash: groupHashSnooze,
        expiry: '2099-01-01T00:00:00Z',
      });
      expect(ackAction).toMatchObject({ group_hash: groupHashAck, episode_id: ackEpisodeId });
    }
  );

  apiTest(
    'partial success: returns processed < total when some group_hashes are unknown',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-partial-rule';
      const knownGroup = 'bulk-partial-known-group';
      const knownEpisode = 'bulk-partial-known-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: knownGroup,
          episode: { id: knownEpisode, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: knownGroup, action_type: 'ack', episode_id: knownEpisode },
          {
            group_hash: 'bulk-partial-unknown-group',
            action_type: 'ack',
            episode_id: 'bulk-partial-unknown-episode',
          },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 1, total: 2 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['ack'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'ack',
        group_hash: knownGroup,
        episode_id: knownEpisode,
      });
    }
  );

  apiTest(
    'partial success: returns processed=0 when every group_hash is unknown',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-allinvalid-rule';

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [
          {
            group_hash: 'bulk-allinvalid-1',
            action_type: 'ack',
            episode_id: 'bulk-allinvalid-1-ep',
          },
          { group_hash: 'bulk-allinvalid-2', action_type: 'snooze' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 0, total: 2 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['ack', 'snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'lifecycle: bulk deactivate writes the synthetic .rule-events doc and flips episode.status to inactive',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-deactivate-rule';
      const groupHash = 'bulk-deactivate-group';
      const episodeId = 'bulk-deactivate-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: groupHash, action_type: 'deactivate', reason: 'bulk deactivate' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 1, total: 1 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['deactivate'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'deactivate',
        group_hash: groupHash,
        episode_id: episodeId,
        rule_id: ruleId,
        reason: 'bulk deactivate',
      });

      // The bulk dispatch must produce the synthetic rule-event so the next
      // UI/API read sees the deactivation immediately — without waiting for
      // the next rule run.
      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        rule: { id: ruleId },
        group_hash: groupHash,
        status: 'recovered',
        source: 'internal',
        type: 'alert',
        episode: { id: episodeId, status: 'inactive' },
      });
    }
  );

  apiTest(
    'lifecycle: bulk activate restores episode.status to the pre-deactivate state',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-activate-rule';
      const groupHash = 'bulk-activate-group';
      const episodeId = 'bulk-activate-episode';
      const [preDeactivateTs, deactivateTs] = buildTimestampSequence(1_000, 2);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': preDeactivateTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
        buildAlertEvent({
          '@timestamp': deactivateTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          type: 'alert',
          episode: { id: episodeId, status: 'inactive' },
        }),
      ]);
      await apiServices.alertingV2.alertActions.seed([
        buildAuditAction({
          ruleId,
          groupHash,
          episodeId,
          actionType: 'deactivate',
          timestamp: deactivateTs,
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: groupHash, action_type: 'activate', reason: 'bulk activate' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 1, total: 1 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['activate'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'activate',
        group_hash: groupHash,
        episode_id: episodeId,
        reason: 'bulk activate',
      });

      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        rule: { id: ruleId },
        group_hash: groupHash,
        status: 'breached',
        source: 'internal',
        type: 'alert',
        episode: { id: episodeId, status: 'active' },
      });
    }
  );

  apiTest(
    'lifecycle: silently skips a bulk deactivate item whose episode is already inactive',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-skip-deactivate-rule';
      const groupHashOk = 'bulk-skip-deactivate-ok-group';
      const groupHashAlreadyInactive = 'bulk-skip-deactivate-inactive-group';
      const episodeIdOk = 'bulk-skip-deactivate-ok-episode';
      const episodeIdInactive = 'bulk-skip-deactivate-inactive-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashOk,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeIdOk, status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashAlreadyInactive,
          status: 'recovered',
          type: 'alert',
          episode: { id: episodeIdInactive, status: 'inactive' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: groupHashOk, action_type: 'deactivate', reason: 'should write' },
          {
            group_hash: groupHashAlreadyInactive,
            action_type: 'deactivate',
            reason: 'should be skipped',
          },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 1, total: 2 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['deactivate'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        group_hash: groupHashOk,
        action_type: 'deactivate',
        reason: 'should write',
      });
    }
  );

  apiTest(
    'lifecycle: silently skips a bulk activate item whose episode is still active',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-skip-activate-rule';
      const groupHash = 'bulk-skip-activate-group';
      const episodeId = 'bulk-skip-activate-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: groupHash, action_type: 'activate', reason: 'precondition will fail' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ processed: 0, total: 1 });

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['activate'],
      });
      expect(actions).toHaveLength(0);

      // The latest .rule-events state must remain unchanged.
      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        episode: { id: episodeId, status: 'active' },
      });
    }
  );

  apiTest('schema: rejects an empty array with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: [],
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects more than 100 items with 400', async ({ apiClient }) => {
    const items = Array.from({ length: 101 }, (_v, i) => ({
      group_hash: `bulk-too-many-${i}`,
      action_type: 'ack' as const,
      episode_id: `bulk-too-many-ep-${i}`,
    }));

    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: items,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects an item missing group_hash with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: [{ action_type: 'ack', episode_id: 'some-episode' }],
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects an item with unknown action_type with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: [{ group_hash: 'any-group', action_type: 'not-a-real-type' }],
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'schema: rejects an item with an invalid per-action body with 400',
    async ({ apiClient }) => {
      // `tag` items require a `tags` array; sending `tags: 'string'` should
      // fail the discriminated-union validator.
      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: 'any-group', action_type: 'tag', tags: 'not-an-array' }],
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('schema: rejects an item with empty group_hash with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: [{ group_hash: '', action_type: 'ack', episode_id: 'some-episode' }],
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'schema: rejects an item with group_hash over 256 chars with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: 'a'.repeat(257), action_type: 'ack', episode_id: 'some-episode' }],
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('schema: rejects a non-array body with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
      headers: writerHeaders,
      body: { group_hash: 'any-group', action_type: 'ack', episode_id: 'some-episode' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: [
          {
            group_hash: 'bulk-authz-read-group',
            action_type: 'ack',
            episode_id: 'bulk-authz-read-episode',
          },
        ],
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(BULK_ALERT_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: [
          {
            group_hash: 'bulk-authz-none-group',
            action_type: 'ack',
            episode_id: 'bulk-authz-none-episode',
          },
        ],
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
