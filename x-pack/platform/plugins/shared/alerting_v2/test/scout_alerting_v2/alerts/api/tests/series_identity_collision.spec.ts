/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import type { AlertingApiServicesFixture } from '../fixtures';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  apiTest,
  buildAlertEvent,
  buildGroupHash,
  buildSeriesId,
  BULK_SNOOZE_SERIES_ACTION_URL,
  getDeactivateEpisodeActionUrl,
  getSnoozeSeriesActionUrl,
  testData,
} from '../fixtures';

const RULE_A_ID = 'collision-rule-a';
const RULE_B_ID = 'collision-rule-b';
const SHARED_GROUP_HASH = buildGroupHash('collision-shared-group');

apiTest.describe(
  'Series identity when two rules share a group_hash',
  { tag: '@local-stateful-classic' },
  () => {
    let writerCredentials: RoleApiCredentials;
    let writerHeaders: Record<string, string>;

    // Both rules emit events for the same group_hash, rule B's strictly later, so
    // a lookup by group_hash alone would resolve both series to rule B's event.
    const seedCollidingSeries = async (
      apiServices: AlertingApiServicesFixture,
      alertIds: { ruleA: string; ruleB: string }
    ) => {
      const now = Date.now();
      const eventA = buildAlertEvent({
        '@timestamp': new Date(now - 60_000).toISOString(),
        rule: { id: RULE_A_ID, version: 1 },
        group_hash: SHARED_GROUP_HASH,
        source: 'internal',
        alert: { id: alertIds.ruleA, status: 'active' },
      });
      const eventB = buildAlertEvent({
        '@timestamp': new Date(now).toISOString(),
        rule: { id: RULE_B_ID, version: 1 },
        group_hash: SHARED_GROUP_HASH,
        source: 'internal',
        alert: { id: alertIds.ruleB, status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([eventA, eventB]);

      return { seriesIdA: buildSeriesId(eventA), seriesIdB: buildSeriesId(eventB) };
    };

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
      'snooze: stamps the action with the rule of the requested series, not the latest event of the shared group_hash',
      async ({ apiClient, apiServices }) => {
        const { seriesIdA } = await seedCollidingSeries(apiServices, {
          ruleA: 'collision-snooze-episode-a',
          ruleB: 'collision-snooze-episode-b',
        });

        const response = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdA), {
          headers: writerHeaders,
          body: {},
        });
        expect(response).toHaveStatusCode(204);

        const actions = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['snooze'],
        });
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
          action_type: 'snooze',
          group_hash: SHARED_GROUP_HASH,
          alert_id: null,
          rule_id: RULE_A_ID,
          space_id: 'default',
        });

        const ruleBActions = await apiServices.alertingV2.alertActionsEvents.find({
          ruleId: RULE_B_ID,
          actionTypes: ['snooze'],
        });
        expect(ruleBActions).toHaveLength(0);

        // Repeating the request must resolve to the same owner every time.
        const repeatedResponse = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdA), {
          headers: writerHeaders,
          body: {},
        });
        expect(repeatedResponse).toHaveStatusCode(204);

        const repeatedActions = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['snooze'],
        });
        expect(repeatedActions.length).toBeGreaterThanOrEqual(1);
        expect(repeatedActions.every((action) => action.rule_id === RULE_A_ID)).toBe(true);
      }
    );

    apiTest(
      'bulk snooze: stamps each action with the rule of its own series',
      async ({ apiClient, apiServices }) => {
        const { seriesIdA, seriesIdB } = await seedCollidingSeries(apiServices, {
          ruleA: 'collision-bulk-episode-a',
          ruleB: 'collision-bulk-episode-b',
        });

        const response = await apiClient.post(BULK_SNOOZE_SERIES_ACTION_URL, {
          headers: writerHeaders,
          body: { items: [{ series_id: seriesIdA }, { series_id: seriesIdB }] },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });

        const actions = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['snooze'],
        });
        expect(actions).toHaveLength(2);
        expect(actions.map((action) => action.rule_id).sort()).toStrictEqual([
          RULE_A_ID,
          RULE_B_ID,
        ]);
      }
    );

    apiTest(
      'deactivate: closes the latest episode of its own series even when another rule shares the group_hash',
      async ({ apiClient, apiServices }) => {
        const episodeIdA = 'collision-episode-a';
        await seedCollidingSeries(apiServices, {
          ruleA: episodeIdA,
          ruleB: 'collision-episode-b',
        });

        const response = await apiClient.post(getDeactivateEpisodeActionUrl(episodeIdA), {
          headers: writerHeaders,
          body: { reason: 'close rule A only' },
        });
        expect(response).toHaveStatusCode(204);

        const actions = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['deactivate'],
        });
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
          action_type: 'deactivate',
          group_hash: SHARED_GROUP_HASH,
          alert_id: episodeIdA,
          rule_id: RULE_A_ID,
          space_id: 'default',
        });
      }
    );
  }
);
