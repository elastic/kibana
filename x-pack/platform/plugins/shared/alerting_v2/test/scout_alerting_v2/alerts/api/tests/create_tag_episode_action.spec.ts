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
  getTagEpisodeActionUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

/*
 * Authorization tests below use `requestAuth.getApiKeyForCustomRole`, which
 * is not yet supported on Elastic Cloud Hosted (custom roles fall back to
 * `viewer`). Restrict the suite to local stateful (classic) until ECH lands.
 */

apiTest.describe('Create tag episode action API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('tag: writes a tag action and returns 204', async ({ apiClient, apiServices }) => {
    const ruleId = 'tag-happy-rule';
    const groupHash = 'tag-happy-group';
    const episodeId = 'tag-happy-episode';
    const tags = ['production', 'reviewed'];
    await apiServices.alertingV2.ruleEvents.seed([
      buildAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
      }),
    ]);
    const response = await apiClient.post(getTagEpisodeActionUrl(episodeId), {
      headers: writerHeaders,
      body: { tags },
    });
    expect(response).toHaveStatusCode(204);
    const actions = await apiServices.alertingV2.alertActionsEvents.find({
      ruleId,
      actionTypes: ['tag'],
    });
    expect(actions).toHaveLength(1);
    // The group_hash is resolved server-side from the episode's events.
    expect(actions[0]).toMatchObject({
      action_type: 'tag',
      group_hash: groupHash,
      episode_id: episodeId,
      rule_id: ruleId,
      space_id: 'default',
      tags,
    });
  });

  apiTest(
    'tag: accepts an empty tags array and returns 204',
    async ({ apiClient, apiServices }) => {
      // The tag schema doesn't enforce a minimum array length, so `tags: []`
      // must be accepted. Persisting an empty tags action is a documented way
      // to record "tags were touched" without listing any.
      const ruleId = 'tag-empty-rule';
      const groupHash = 'tag-empty-group';
      const episodeId = 'tag-empty-episode';
      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);
      const response = await apiClient.post(getTagEpisodeActionUrl(episodeId), {
        headers: writerHeaders,
        body: { tags: [] },
      });
      expect(response).toHaveStatusCode(204);
      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['tag'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'tag',
        group_hash: groupHash,
        episode_id: episodeId,
        rule_id: ruleId,
      });
    }
  );

  apiTest(
    'tag: audit actions work on old (superseded) episodes',
    async ({ apiClient, apiServices }) => {
      // Two episodes for the same series: the older one closed, a newer one
      // is active. Tag is a pure audit record, so tagging the OLDER episode
      // must succeed and the persisted doc must carry the older episode id.
      const ruleId = 'tag-old-episode-rule';
      const groupHash = 'tag-old-episode-group';
      const olderEpisodeId = 'tag-old-episode-older';
      const newerEpisodeId = 'tag-old-episode-newer';
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

      const response = await apiClient.post(getTagEpisodeActionUrl(olderEpisodeId), {
        headers: writerHeaders,
        body: { tags: ['archived'] },
      });
      expect(response).toHaveStatusCode(204);

      const actions = await apiServices.alertingV2.alertActionsEvents.find({
        ruleId,
        actionTypes: ['tag'],
      });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        action_type: 'tag',
        group_hash: groupHash,
        episode_id: olderEpisodeId,
        tags: ['archived'],
      });
    }
  );

  apiTest('schema: rejects body missing tags with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects more than 20 tags with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { tags: Array.from({ length: 21 }, (_v, i) => `tag-${i}`) },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects an empty tag string with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { tags: ['valid', ''] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects a tag over 128 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { tags: ['a'.repeat(129)] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects non-string tag elements with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { tags: ['valid', 42] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects unknown body fields (strict mode) with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('any-episode'), {
      headers: writerHeaders,
      body: { tags: ['valid'], extra: 'nope' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('schema: rejects episode_id over 150 chars with 400', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('a'.repeat(151)), {
      headers: writerHeaders,
      body: { tags: ['production'] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('returns 404 when episode_id matches no events', async ({ apiClient }) => {
    const response = await apiClient.post(getTagEpisodeActionUrl('unknown-episode'), {
      headers: writerHeaders,
      body: { tags: ['production'] },
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ALERT_EPISODE_NOT_FOUND');
    expect(response.body.details).toMatchObject({ episode_id: 'unknown-episode' });
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(getTagEpisodeActionUrl('tag-authz-read-episode'), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { tags: ['production'] },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getTagEpisodeActionUrl('tag-authz-none-episode'), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { tags: ['production'] },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
