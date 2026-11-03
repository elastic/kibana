/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import {
  buildEpisodeActionsHistoryQuery,
  buildEpisodeQuery,
  buildSeriesSnoozeQuery,
} from '@kbn/alerting-v2-common-queries';
import { buildGroupActionsQuery } from '@kbn/alerting-v2-episodes-ui/queries/group_actions_query';
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

// The rule ids, group hash and episode ids are unique to this run, so the cleanup hooks can
// target exactly what this suite created instead of wiping the shared data streams.
const RUN_ID = randomUUID().slice(0, 8);
const RULE_A_ID = `collision-rule-a-${RUN_ID}`;
const RULE_B_ID = `collision-rule-b-${RUN_ID}`;
const SHARED_GROUP_HASH = buildGroupHash(`collision-shared-group-${RUN_ID}`);
const SPACE_ID = 'default';

/** Rows of an ES|QL response as objects, so the specs can assert on the columns they care about. */
const toRows = ({
  columns,
  values,
}: {
  columns: Array<{ name: string }>;
  values: unknown[][];
}): Array<Record<string, unknown>> =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]])));

const runEsql = async (esClient: EsClient, query: string) =>
  toRows(await esClient.esql.query({ query, format: 'json' }));

apiTest.describe(
  'Series identity when two rules share a group_hash',
  { tag: tags.stateful.all },
  () => {
    let writerCredentials: RoleApiCredentials;
    let writerHeaders: Record<string, string>;

    // Both rules emit events for the same group_hash, rule B's strictly later, so
    // a lookup by group_hash alone would resolve both series to rule B's event.
    const seedCollidingSeries = async (apiServices: AlertingApiServicesFixture, label: string) => {
      const episodeIdA = `${label}-episode-a-${RUN_ID}`;
      const episodeIdB = `${label}-episode-b-${RUN_ID}`;
      const now = Date.now();
      const eventA = buildAlertEvent({
        '@timestamp': new Date(now - 60_000).toISOString(),
        rule: { id: RULE_A_ID, version: 1 },
        group_hash: SHARED_GROUP_HASH,
        source: 'internal',
        alert: { id: episodeIdA, status: 'active' },
      });
      const eventB = buildAlertEvent({
        '@timestamp': new Date(now).toISOString(),
        rule: { id: RULE_B_ID, version: 1 },
        group_hash: SHARED_GROUP_HASH,
        source: 'internal',
        alert: { id: episodeIdB, status: 'active' },
      });
      await apiServices.alertingV2.ruleEvents.seed([eventA, eventB]);

      return {
        episodeIdA,
        episodeIdB,
        seriesIdA: buildSeriesId(eventA),
        seriesIdB: buildSeriesId(eventB),
      };
    };

    const cleanUpCollidingSeries = async (apiServices: AlertingApiServicesFixture) => {
      for (const ruleId of [RULE_A_ID, RULE_B_ID]) {
        await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId });
        await apiServices.alertingV2.alertActionsEvents.cleanUp({ ruleId });
      }
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
      writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await cleanUpCollidingSeries(apiServices);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await cleanUpCollidingSeries(apiServices);
    });

    apiTest(
      'snooze: stamps the action with the rule of the requested series, not the latest event of the shared group_hash',
      async ({ apiClient, apiServices }) => {
        const { seriesIdA } = await seedCollidingSeries(apiServices, 'collision-snooze');

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
          space_id: SPACE_ID,
        });

        const ruleBActions = await apiServices.alertingV2.alertActionsEvents.find({
          ruleId: RULE_B_ID,
          actionTypes: ['snooze'],
        });
        expect(ruleBActions).toHaveLength(0);

        // Rule A's series is now snoozed indefinitely, so repeating the request is a no-op. It is
        // judged against rule A's own series and writes nothing.
        const repeatedResponse = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdA), {
          headers: writerHeaders,
          body: {},
        });
        expect(repeatedResponse).toHaveStatusCode(409);
        expect(repeatedResponse.body.code).toBe('ALERT_ACTION_NO_OP');

        const actionsAfterRepeat = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['snooze'],
        });
        expect(actionsAfterRepeat).toHaveLength(1);
        expect(actionsAfterRepeat[0].rule_id).toBe(RULE_A_ID);
      }
    );

    apiTest(
      'snooze: a snooze on one rule does not make the identical snooze on the other rule a no-op',
      async ({ apiClient, apiServices }) => {
        const { seriesIdA, seriesIdB } = await seedCollidingSeries(apiServices, 'collision-noop');

        const responseA = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdA), {
          headers: writerHeaders,
          body: {},
        });
        expect(responseA).toHaveStatusCode(204);

        // Same indefinite snooze, same group_hash, but rule B's series has no snooze of its own.
        const responseB = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdB), {
          headers: writerHeaders,
          body: {},
        });
        expect(responseB).toHaveStatusCode(204);

        const actions = await apiServices.alertingV2.alertActionsEvents.find({
          groupHash: SHARED_GROUP_HASH,
          actionTypes: ['snooze'],
        });
        expect(actions.map((action) => action.rule_id).sort()).toStrictEqual([
          RULE_A_ID,
          RULE_B_ID,
        ]);
      }
    );

    apiTest(
      'bulk snooze: stamps each action with the rule of its own series',
      async ({ apiClient, apiServices }) => {
        const { seriesIdA, seriesIdB } = await seedCollidingSeries(apiServices, 'collision-bulk');

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
        const { episodeIdA } = await seedCollidingSeries(apiServices, 'collision-deactivate');

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
          space_id: SPACE_ID,
        });
      }
    );

    apiTest(
      'read side: a snooze on one rule shows only on that rule in the episode and its action history',
      async ({ apiClient, apiServices, esClient }) => {
        const { episodeIdA, episodeIdB, seriesIdA, seriesIdB } = await seedCollidingSeries(
          apiServices,
          'collision-read'
        );

        const response = await apiClient.post(getSnoozeSeriesActionUrl(seriesIdA), {
          headers: writerHeaders,
          body: {},
        });
        expect(response).toHaveStatusCode(204);

        // Episode query: each episode resolves to its own series, not just the group_hash.
        const [episodeA] = await runEsql(
          esClient,
          buildEpisodeQuery(SPACE_ID, episodeIdA).print('basic')
        );
        const [episodeB] = await runEsql(
          esClient,
          buildEpisodeQuery(SPACE_ID, episodeIdB).print('basic')
        );
        expect(episodeA).toMatchObject({ 'episode.id': episodeIdA, series_id: seriesIdA });
        expect(episodeB).toMatchObject({ 'episode.id': episodeIdB, series_id: seriesIdB });

        // Group actions query (alert flyout and details page): the snooze rows are kept apart by
        // rule, so each alert reads its own rule's row.
        const groupActions = await runEsql(
          esClient,
          buildGroupActionsQuery(SPACE_ID, [SHARED_GROUP_HASH]).print('basic')
        );
        const snoozedGroupActions = groupActions.filter(
          (row) => row.last_snooze_action === 'snooze'
        );
        expect(snoozedGroupActions).toHaveLength(1);
        expect(snoozedGroupActions[0]).toMatchObject({
          rule_id: RULE_A_ID,
          group_hash: SHARED_GROUP_HASH,
        });

        // Series snooze query (Agent Builder alert tools): the snooze state is matched per
        // series, not per group_hash.
        const [snoozeA] = await runEsql(
          esClient,
          buildSeriesSnoozeQuery(SPACE_ID, SHARED_GROUP_HASH, seriesIdA).print('basic')
        );
        const [snoozeB] = await runEsql(
          esClient,
          buildSeriesSnoozeQuery(SPACE_ID, SHARED_GROUP_HASH, seriesIdB).print('basic')
        );
        expect(snoozeA.last_snooze_action).toBe('snooze');
        expect(snoozeB?.last_snooze_action ?? null).toBeNull();

        // Action history: series-level actions are matched by series, so rule A's snooze is in
        // rule A's history and absent from rule B's.
        const historyA = await runEsql(
          esClient,
          buildEpisodeActionsHistoryQuery(
            SPACE_ID,
            episodeIdA,
            { seriesId: seriesIdA, groupHash: SHARED_GROUP_HASH },
            { limit: 25 }
          ).print('basic')
        );
        const historyB = await runEsql(
          esClient,
          buildEpisodeActionsHistoryQuery(
            SPACE_ID,
            episodeIdB,
            { seriesId: seriesIdB, groupHash: SHARED_GROUP_HASH },
            { limit: 25 }
          ).print('basic')
        );
        expect(historyA.map((row) => row.action_type)).toStrictEqual(['snooze']);
        expect(historyB).toHaveLength(0);
      }
    );
  }
);
