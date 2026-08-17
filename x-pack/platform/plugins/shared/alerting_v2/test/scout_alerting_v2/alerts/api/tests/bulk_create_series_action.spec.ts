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
  BULK_SERIES_ACTION_URL,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Bulk create series actions API', { tag: '@local-stateful-classic' }, () => {
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
      const ruleId = 'bulk-series-single-rule';
      const groupHash = 'bulk-series-single-group';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: 'bulk-series-single-episode', status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: groupHash, action_type: 'tag', tags: ['production'] }],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['tag'],
      });
      expect(actions).toHaveLength(1);
      // Series actions target the series as a whole, so the persisted doc
      // carries `episode_id: null` even though an episode exists.
      expect(actions[0]).toMatchObject({
        action_type: 'tag',
        group_hash: groupHash,
        episode_id: null,
        rule_id: ruleId,
        tags: ['production'],
      });
    }
  );

  apiTest(
    'bulk: processes mixed series action types and persists each side effect',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-mixed-rule';
      const groupHashTag = 'bulk-series-mixed-group-tag';
      const groupHashSnooze = 'bulk-series-mixed-group-snooze';
      const groupHashUnsnooze = 'bulk-series-mixed-group-unsnooze';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashTag,
          episode: { id: 'bulk-series-mixed-tag-episode', status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashSnooze,
          episode: { id: 'bulk-series-mixed-snooze-episode', status: 'active' },
        }),
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHashUnsnooze,
          episode: { id: 'bulk-series-mixed-unsnooze-episode', status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: groupHashTag, action_type: 'tag', tags: ['important', 'reviewed'] },
          { group_hash: groupHashSnooze, action_type: 'snooze', expiry: '2099-01-01T00:00:00Z' },
          { group_hash: groupHashUnsnooze, action_type: 'unsnooze' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 3, errors: [] });

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['tag', 'snooze', 'unsnooze'],
      });
      expect(actions).toHaveLength(3);

      const tagAction = actions.find((doc) => doc.action_type === 'tag');
      const snoozeAction = actions.find((doc) => doc.action_type === 'snooze');
      const unsnoozeAction = actions.find((doc) => doc.action_type === 'unsnooze');

      expect(tagAction).toMatchObject({
        group_hash: groupHashTag,
        episode_id: null,
        tags: ['important', 'reviewed'],
      });
      expect(snoozeAction).toMatchObject({
        group_hash: groupHashSnooze,
        episode_id: null,
        expiry: '2099-01-01T00:00:00Z',
      });
      expect(unsnoozeAction).toMatchObject({ group_hash: groupHashUnsnooze, episode_id: null });
    }
  );

  apiTest(
    'partial success: reports ALERT_GROUP_NOT_FOUND when some group_hashes are unknown',
    async ({ apiClient, apiServices }) => {
      const ruleId = 'bulk-series-partial-rule';
      const knownGroup = 'bulk-series-partial-known-group';

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: knownGroup,
          episode: { id: 'bulk-series-partial-known-episode', status: 'active' },
        }),
      ]);

      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: knownGroup, action_type: 'tag', tags: ['production'] },
          { group_hash: 'bulk-series-partial-unknown-group', action_type: 'tag', tags: ['x'] },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe('bulk-series-partial-unknown-group');
      expect(response.body.errors[0].error.code).toBe('ALERT_GROUP_NOT_FOUND');

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['tag'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'tag',
        group_hash: knownGroup,
        episode_id: null,
      });
    }
  );

  apiTest(
    'partial success: reports a per-item error for every action when every group_hash is unknown',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [
          { group_hash: 'bulk-series-allinvalid-1', action_type: 'tag', tags: ['x'] },
          { group_hash: 'bulk-series-allinvalid-2', action_type: 'snooze' },
        ],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(0);
      expect(response.body.errors).toHaveLength(2);
      expect(
        response.body.errors.map((e: { error: { code: string } }) => e.error.code)
      ).toStrictEqual(['ALERT_GROUP_NOT_FOUND', 'ALERT_GROUP_NOT_FOUND']);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        actionTypes: ['tag', 'snooze'],
      });
      expect(actions).toHaveLength(0);
    }
  );

  apiTest('schema: rejects an empty array with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects more than 100 items with 400', async ({ apiClient }) => {
    const items = Array.from({ length: 101 }, (_v, i) => ({
      group_hash: `bulk-series-too-many-${i}`,
      action_type: 'tag' as const,
      tags: ['x'],
    }));

    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: items,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item missing group_hash with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [{ action_type: 'tag', tags: ['x'] }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item with unknown action_type with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [{ group_hash: 'any-group', action_type: 'not-a-real-type' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an episode-scoped action_type (ack) with 400', async ({ apiClient }) => {
    // Episode-scoped actions (ack/unack/assign/activate/deactivate) belong
    // to the episodes bulk route; the series discriminated union rejects
    // them.
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [{ group_hash: 'any-group', action_type: 'ack' }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an item carrying episode_id with 400', async ({ apiClient }) => {
    // Series items are identified by group_hash only — an episode_id is an
    // unrecognized key for the strict item schema.
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [
        { group_hash: 'any-group', action_type: 'tag', tags: ['x'], episode_id: 'some-episode' },
      ],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with an invalid per-action body with 400',
    async ({ apiClient }) => {
      // `tag` items require a `tags` array; sending `tags: 'string'` should
      // fail the discriminated-union validator.
      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: 'any-group', action_type: 'tag', tags: 'not-an-array' }],
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects an item with empty group_hash with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: [{ group_hash: '', action_type: 'tag', tags: ['x'] }],
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with group_hash over 256 chars with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: 'a'.repeat(257), action_type: 'tag', tags: ['x'] }],
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('schema: rejects a non-array body with 400', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
      headers: writerHeaders,
      body: { group_hash: 'any-group', action_type: 'tag', tags: ['x'] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'schema: rejects an item with unknown body fields (strict mode) with 400',
    async ({ apiClient }) => {
      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: writerHeaders,
        body: [{ group_hash: 'any-group', action_type: 'tag', tags: ['x'], unknownField: 'x' }],
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

      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: [{ group_hash: 'bulk-series-authz-read-group', action_type: 'tag', tags: ['x'] }],
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(BULK_SERIES_ACTION_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: [{ group_hash: 'bulk-series-authz-none-group', action_type: 'tag', tags: ['x'] }],
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
