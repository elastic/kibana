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
  getActivateAlertActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

/**
 * Builds an `.alert-actions` audit document with the minimum required fields,
 * timestamped relative to a base instant so seeded sequences (e.g. snooze →
 * deactivate) preserve their causal order during ESQL `SORT @timestamp DESC`.
 */
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

apiTest.describe('Create activate alert action API', { tag: '@local-stateful-classic' }, () => {
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
    'activate: writes an activate action and returns 204',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-happy-rule';
      const groupHash = 'activate-happy-group';
      const episodeId = 'activate-happy-episode';
      const reason = 'reopen this';
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

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason },
      });
      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['activate'],
      });
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

  apiTest(
    'activate: restores the pre-deactivate lifecycle state into a synthetic .rule-events doc',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-rule-event-rule';
      const groupHash = 'activate-rule-event-group';
      const episodeId = 'activate-rule-event-episode';
      const [preDeactivateTs, deactivateTs] = buildTimestampSequence(1_000, 2);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': preDeactivateTs,
          rule: { id: ruleId, version: 7 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          data: { 'host.name': 'host-a' },
          severity: 'high',
          episode: { id: episodeId, status: 'active' },
        }),
        buildAlertEvent({
          '@timestamp': deactivateTs,
          rule: { id: ruleId, version: 7 },
          group_hash: groupHash,
          status: 'recovered',
          type: 'alert',
          data: { 'host.name': 'host-a' },
          severity: 'high',
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

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'manual reopen' },
      });
      expect(response).toHaveStatusCode(204);

      // Three rule events exist now: pre-deactivate (active), deactivate-synthetic
      // (inactive) and the new restored event (active). The restored doc reuses
      // the same `episode.id` and the engine-observed status that preceded
      // deactivate, with `@timestamp` advanced to now.
      const restored = await apiServices.alertingV2.ruleEvents.find(ruleId, {
        status: 'breached',
        type: 'alert',
        episodeStatus: 'active',
      });
      expect(restored).toHaveLength(2);

      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        rule: { id: ruleId, version: 7 },
        group_hash: groupHash,
        status: 'breached',
        type: 'alert',
        episode: { id: episodeId, status: 'active' },
        data: { 'host.name': 'host-a' },
        severity: 'high',
        space_id: 'default',
      });
    }
  );

  apiTest(
    'activate: restores recovering with status_count when the pre-deactivate state was recovering',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-recovering-rule';
      const groupHash = 'activate-recovering-group';
      const episodeId = 'activate-recovering-episode';
      const [activeTs, recoveringTs, deactivateTs] = buildTimestampSequence(1_000, 3);

      await apiServices.alertingV2.ruleEvents.seed([
        // The episode breached, then started recovering with status_count = 2
        // (e.g. two recovered observations against a recovering_count=5 window),
        // then the user deactivated mid-recovery.
        buildAlertEvent({
          '@timestamp': activeTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
        buildAlertEvent({
          '@timestamp': recoveringTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          type: 'alert',
          episode: { id: episodeId, status: 'recovering', status_count: 2 },
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

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen mid-recovery' },
      });
      expect(response).toHaveStatusCode(204);

      const latestStates = await apiServices.alertingV2.ruleEvents.getLatestEpisodeStates(ruleId);
      expect(latestStates.get(groupHash)).toMatchObject({
        episode: { id: episodeId, status: 'recovering', status_count: 2 },
        status: 'recovered',
      });
    }
  );

  apiTest('schema: rejects body missing reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects empty reason with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: '' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects reason over 1024 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'a'.repeat(1025) },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('any-group'), {
      headers: writerHeaders,
      body: { reason: 'valid', extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects group_hash over 256 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('a'.repeat(257)), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('returns 404 when group_hash matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getActivateAlertActionUrl('unknown-group'), {
      headers: writerHeaders,
      body: { reason: 'valid reason' },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'precondition: rejects activate when the latest event is still active (no superseding episode)',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-still-active-rule';
      const groupHash = 'activate-still-active-group';
      const episodeId = 'activate-still-active-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        code: 'INVALID_EPISODE_STATE_TRANSITION',
        details: {
          group_hash: groupHash,
          episode_id: episodeId,
          episode_status: 'active',
          action_type: 'activate',
        },
      });

      const ruleEvents = await apiServices.alertingV2.ruleEvents.find(ruleId);
      expect(ruleEvents).toHaveLength(1);
      const actions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['activate'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest(
    'precondition: rejects activate when a newer episode has superseded the deactivated one',
    async ({ apiClient, apiServices }) => {
      // Scenario: user deactivates episode-A → rule re-breaches → engine starts
      // a new episode-B → user clicks activate. The latest .rule-events doc for
      // the group_hash now belongs to episode-B (status: active), so activate
      // must reject; the user should engage with the new episode instead.
      const ruleId = 'activate-superseded-rule';
      const groupHash = 'activate-superseded-group';
      const oldEpisodeId = 'activate-superseded-episode-old';
      const newEpisodeId = 'activate-superseded-episode-new';
      const [activeTs, deactivateTs, rebreachTs] = buildTimestampSequence(1_000, 3);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          '@timestamp': activeTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: oldEpisodeId, status: 'active' },
        }),
        buildAlertEvent({
          '@timestamp': deactivateTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          type: 'alert',
          episode: { id: oldEpisodeId, status: 'inactive' },
        }),
        buildAlertEvent({
          '@timestamp': rebreachTs,
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'breached',
          type: 'alert',
          episode: { id: newEpisodeId, status: 'active' },
        }),
      ]);
      await apiServices.alertingV2.alertActions.seed([
        buildAuditAction({
          ruleId,
          groupHash,
          episodeId: oldEpisodeId,
          actionType: 'deactivate',
          timestamp: deactivateTs,
        }),
      ]);

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        code: 'INVALID_EPISODE_STATE_TRANSITION',
        details: {
          group_hash: groupHash,
          // Latest event is for the *new* episode → activate targets it and
          // rejects because its status is `active`, not `inactive`.
          episode_id: newEpisodeId,
          episode_status: 'active',
          action_type: 'activate',
        },
      });
    }
  );

  apiTest(
    'precondition: rejects activate of a naturally-recovered (never user-deactivated) episode',
    async ({ apiClient, apiServices }) => {
      // The episode reached `inactive` through the normal FSM (no deactivate
      // audit row exists). There is nothing to invert; reject so the user
      // doesn't accidentally re-open an episode the engine itself closed.
      const ruleId = 'activate-natural-recovery-rule';
      const groupHash = 'activate-natural-recovery-group';
      const episodeId = 'activate-natural-recovery-episode';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          status: 'recovered',
          type: 'alert',
          episode: { id: episodeId, status: 'inactive' },
        }),
      ]);

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        code: 'INVALID_EPISODE_STATE_TRANSITION',
        details: {
          group_hash: groupHash,
          episode_id: episodeId,
          episode_status: 'inactive',
          action_type: 'activate',
          last_lifecycle_action: null,
        },
      });
    }
  );

  apiTest(
    'precondition: rejects double-activate when the latest action is already activate',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'activate-double-rule';
      const groupHash = 'activate-double-group';
      const episodeId = 'activate-double-episode';
      const [deactivateTs, activateTs] = buildTimestampSequence(1_000, 2);

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
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
        buildAuditAction({
          ruleId,
          groupHash,
          episodeId,
          actionType: 'activate',
          timestamp: activateTs,
        }),
      ]);

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen again' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        code: 'INVALID_EPISODE_STATE_TRANSITION',
        details: {
          group_hash: groupHash,
          episode_id: episodeId,
          episode_status: 'inactive',
          action_type: 'activate',
          last_lifecycle_action: 'activate',
        },
      });
    }
  );

  apiTest(
    'precondition: allows activate when a non-lifecycle action (tag) was applied between deactivate and activate',
    async ({ apiClient, apiServices }) => {
      // Non-lifecycle actions (tag/ack/assign/snooze/...) must not block a
      // legitimate reopen of a user-deactivated episode. The lifecycle-only
      // filter on the precondition query ignores the intervening `tag` row,
      // so the latest lifecycle action remains `deactivate`.
      const ruleId = 'activate-tag-then-reopen-rule';
      const groupHash = 'activate-tag-then-reopen-group';
      const episodeId = 'activate-tag-then-reopen-episode';
      const [preDeactivateTs, deactivateTs, tagTs] = buildTimestampSequence(1_000, 3);

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
        // User tags the deactivated episode — orthogonal to lifecycle.
        buildAuditAction({
          ruleId,
          groupHash,
          episodeId,
          actionType: 'tag',
          timestamp: tagTs,
        }),
      ]);

      const response = await apiClient.post(getActivateAlertActionUrl(groupHash), {
        headers: writerHeaders,
        body: { reason: 'reopen after tagging' },
      });
      expect(response).toHaveStatusCode(204);

      const activateActions = await apiServices.alertingV2.alertActions.find({
        ruleId,
        actionTypes: ['activate'],
      });
      expect(activateActions).toHaveLength(1);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(
        getActivateAlertActionUrl('activate-authz-read-group'),
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
        getActivateAlertActionUrl('activate-authz-none-group'),
        {
          headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
          body: { reason: 'valid reason' },
        }
      );
      expect(response).toHaveStatusCode(403);
    }
  );
});
