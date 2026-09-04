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
  BULK_EPISODE_ACTION_URL,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Bulk create episode actions API', { tag: '@local-stateful-classic' }, () => {
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
    'bulk: processes a single valid item and returns counts',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-episode-single-rule';
      const groupHash = 'bulk-episode-single-group';
      const episodeId = 'bulk-episode-single-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: episodeId, action_type: 'ack' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['ack'],
      });
      expect(actions).toHaveLength(1);
      // The group_hash is resolved server-side from the episode's events.
      expect(actions[0]).toMatchObject({
        action_type: 'ack',
        group_hash: groupHash,
        episode_id: episodeId,
        rule_id: ruleId,
      });
    }
  );

  apiTest(
    'bulk: processes mixed episode action types and persists each side effect',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-episode-mixed-rule';
      const ackEpisodeId = 'bulk-episode-mixed-ack-episode';
      const assignEpisodeId = 'bulk-episode-mixed-assign-episode';
      const deactivateEpisodeId = 'bulk-episode-mixed-deactivate-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: 'bulk-episode-mixed-group-ack',
          episode: { id: ackEpisodeId, status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: 'bulk-episode-mixed-group-assign',
          episode: { id: assignEpisodeId, status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: 'bulk-episode-mixed-group-deactivate',
          episode: { id: deactivateEpisodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { episode_id: ackEpisodeId, action_type: 'ack' },
          { episode_id: assignEpisodeId, action_type: 'assign', assignee_uid: 'u_someone' },
          { episode_id: deactivateEpisodeId, action_type: 'deactivate', reason: 'bulk close' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 3, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['ack', 'assign', 'deactivate'],
      });
      expect(actions).toHaveLength(3);

      const ackAction = actions.find((doc) => doc.action_type === 'ack');
      const assignAction = actions.find((doc) => doc.action_type === 'assign');
      const deactivateAction = actions.find((doc) => doc.action_type === 'deactivate');

      expect(ackAction).toMatchObject({
        group_hash: 'bulk-episode-mixed-group-ack',
        episode_id: ackEpisodeId,
      });
      expect(assignAction).toMatchObject({
        group_hash: 'bulk-episode-mixed-group-assign',
        episode_id: assignEpisodeId,
        assignee_uid: 'u_someone',
      });
      expect(deactivateAction).toMatchObject({
        group_hash: 'bulk-episode-mixed-group-deactivate',
        episode_id: deactivateEpisodeId,
        reason: 'bulk close',
      });
    }
  );

  apiTest(
    'partial success: reports ALERT_EPISODE_NOT_FOUND when some episode_ids are unknown',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-episode-partial-rule';
      const knownGroup = 'bulk-episode-partial-known-group';
      const knownEpisode = 'bulk-episode-partial-known-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: knownGroup,
          episode: { id: knownEpisode, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { episode_id: knownEpisode, action_type: 'ack' },
          { episode_id: 'bulk-episode-partial-unknown-episode', action_type: 'ack' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('bulk-episode-partial-unknown-episode');
      expect(response.body.errors[0].error.code).toBe('ALERT_EPISODE_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
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
    'partial success: reports a per-item error for every action when every episode_id is unknown',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { episode_id: 'bulk-episode-allinvalid-1', action_type: 'ack' },
          { episode_id: 'bulk-episode-allinvalid-2', action_type: 'unack' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(2);
      expect(
        response.body.errors.map((e: { error: { code: string } }) => e.error.code)
      ).toStrictEqual(['ALERT_EPISODE_NOT_FOUND', 'ALERT_EPISODE_NOT_FOUND']);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        actionTypes: ['ack', 'unack'],
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
          source: 'engine-x',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: episodeId, action_type: 'deactivate', reason: 'bulk deactivate' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
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
      // the next rule run. The `source` is propagated from the last
      // engine-emitted event, not hardcoded, so the synthetic doc stays
      // consistent with the alert lineage.
      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        rule: { id: ruleId },
        group_hash: groupHash,
        status: 'recovered',
        source: 'engine-x',
        type: 'alert',
        episode: { id: episodeId, status: 'inactive' },
      });
    }
  );

  apiTest(
    'lifecycle: bulk activate writes the synthetic .rule-events doc and flips episode.status to active + breached',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-activate-rule';
      const groupHash = 'bulk-activate-group';
      const episodeId = 'bulk-activate-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          source: 'engine-x',
          type: 'alert',
          episode: { id: episodeId, status: 'inactive' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: episodeId, action_type: 'activate', reason: 'bulk activate' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
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

      // The synthetic activate doc propagates `source` from the current
      // alert event (the seeded inactive doc from a prior recovery),
      // so the reopened event stays consistent with the alert lineage.
      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        rule: { id: ruleId },
        group_hash: groupHash,
        status: 'breached',
        source: 'engine-x',
        type: 'alert',
        episode: { id: episodeId, status: 'active' },
      });
    }
  );

  apiTest(
    'lifecycle: reports INVALID_EPISODE_STATE_TRANSITION for a bulk deactivate item whose episode is already inactive',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-skip-deactivate-rule';
      const episodeIdOk = 'bulk-skip-deactivate-ok-episode';
      const episodeIdInactive = 'bulk-skip-deactivate-inactive-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: 'bulk-skip-deactivate-ok-group',
          status: 'breached',
          type: 'alert',
          episode: { id: episodeIdOk, status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: 'bulk-skip-deactivate-inactive-group',
          status: 'recovered',
          type: 'alert',
          episode: { id: episodeIdInactive, status: 'inactive' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { episode_id: episodeIdOk, action_type: 'deactivate', reason: 'should write' },
          {
            episode_id: episodeIdInactive,
            action_type: 'deactivate',
            reason: 'should be skipped',
          },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(episodeIdInactive);
      expect(response.body.errors[0].error.code).toBe('INVALID_EPISODE_STATE_TRANSITION');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['deactivate'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        episode_id: episodeIdOk,
        action_type: 'deactivate',
        reason: 'should write',
      });
    }
  );

  apiTest(
    'lifecycle: reports INVALID_EPISODE_STATE_TRANSITION for a bulk activate item whose episode is still active',
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

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { episode_id: episodeId, action_type: 'activate', reason: 'precondition will fail' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(episodeId);
      expect(response.body.errors[0].error.code).toBe('INVALID_EPISODE_STATE_TRANSITION');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
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

  apiTest(
    'lifecycle: reports ALERT_EPISODE_NOT_LATEST for a lifecycle item targeting a superseded episode',
    async ({ apiClient, apiServices }) => {
      // Lifecycle actions are guarded to the latest episode of the series;
      // in bulk the guard is reported per item, keyed by the episode_id.
      const ruleId = 'bulk-not-latest-rule';
      const groupHash = 'bulk-not-latest-group';
      const olderEpisodeId = 'bulk-not-latest-older';
      const newerEpisodeId = 'bulk-not-latest-newer';
      const now = Date.now();

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': new Date(now - 60_000).toISOString(),
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          episode: { id: olderEpisodeId, status: 'inactive' },
        }),
        buildAlertEvent({
          '@timestamp': new Date(now).toISOString(),
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: newerEpisodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: olderEpisodeId, action_type: 'activate', reason: 'reopen old' }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(olderEpisodeId);
      expect(response.body.errors[0].error.code).toBe('ALERT_EPISODE_NOT_LATEST');
      expect(response.body.errors[0].error.details).toMatchObject({ group_hash: groupHash });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['activate'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest('schema: rejects an empty array with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects more than 100 items with 400', async ({ apiClient }) => {
    const items = Array.from({ length: 101 }, (_v, i) => ({
      episode_id: `bulk-episode-too-many-${i}`,
      action_type: 'ack' as const,
    }));

    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: items,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item missing episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [{ action_type: 'ack' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item with unknown action_type with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [{ episode_id: 'any-episode', action_type: 'not-a-real-type' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects a series action_type (tag) with 400', async ({ apiClient }) => {
    // Series-scoped actions (tag/snooze/unsnooze) belong to the series bulk
    // route; the episode discriminated union rejects them.
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [{ episode_id: 'any-episode', action_type: 'tag', tags: ['x'] }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item carrying group_hash with 400', async ({ apiClient }) => {
    // Episode items are identified by episode_id only — the group_hash is
    // resolved server-side, so sending it is an unrecognized key.
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [{ episode_id: 'any-episode', action_type: 'ack', group_hash: 'any-group' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with an invalid per-action body with 400',
    async ({ apiClient }) => {
      // `assign` items require an `assignee_uid`; omitting it should fail
      // the discriminated-union validator.
      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: 'any-episode', action_type: 'assign' }],
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects an item with empty episode_id with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: [{ episode_id: '', action_type: 'ack' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with episode_id over 150 chars with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: 'a'.repeat(151), action_type: 'ack' }],
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects a non-array body with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
      headers: writerHeaders,
      body: { episode_id: 'any-episode', action_type: 'ack' },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with unknown body fields (strict mode) with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: writerHeaders,
        body: [{ episode_id: 'any-episode', action_type: 'ack', unknownField: 'x' }],
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: [{ episode_id: 'bulk-episode-authz-read-episode', action_type: 'ack' }],
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(BULK_EPISODE_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: [{ episode_id: 'bulk-episode-authz-none-episode', action_type: 'ack' }],
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
