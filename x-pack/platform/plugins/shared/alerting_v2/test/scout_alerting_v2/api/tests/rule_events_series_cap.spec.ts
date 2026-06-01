/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies the per-series event cap used by the rule details alert activity
 * timeline. The timeline fetches transition events for the top-N series and
 * renders one lane per series; `buildRuleEventsEsqlQuery` applies a
 * `LIMIT <perSeriesLimit> BY group_hash` so a single overactive ("flapping")
 * series cannot consume the whole `pageSize` budget and starve quieter lanes.
 *
 * This spec executes the *real* production query against a live Elasticsearch,
 * which serves two purposes:
 *   1. Proves the targeted stack actually executes `LIMIT ... BY` (the syntax is
 *      only recognized by Kibana's editor language package; unit tests cannot
 *      prove the query engine runs it).
 *   2. Proves the fairness guarantee: an overactive series is capped while every
 *      quiet series retains all of its events.
 *
 * This spec does not target an HTTP endpoint -- it seeds `.rule-events` and runs
 * an ES|QL query directly via the ES client, mirroring how the browser issues
 * the query through the data plugin's search service.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { apiTest, buildAlertEvent } from '../fixtures';
import {
  buildRuleEventsEsqlQuery,
  PER_SERIES_EVENT_LIMIT,
} from '../../../../public/queries/alert_series_activity/rule_events_query';

const RULE_ID = 'series-cap-rule';

const HOT_SERIES = 'series-hot';
const QUIET_SERIES = ['series-q1', 'series-q2', 'series-q3'];
const QUIET_EVENT_COUNT = 2;
const HOT_EVENT_COUNT = 20;

// Small explicit cap so we can exceed it without seeding hundreds of docs.
const TEST_PER_SERIES_LIMIT = 5;

const BASE_MS = Date.parse('2026-05-01T00:00:00.000Z');
const STEP_MS = 60_000; // 1 minute between events
const GTE_MS = BASE_MS - STEP_MS;
const LTE_MS = BASE_MS + 60 * STEP_MS; // window comfortably covers every seeded event

const seriesEvents = (groupHash: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    buildAlertEvent({
      '@timestamp': new Date(BASE_MS + i * STEP_MS).toISOString(),
      rule: { id: RULE_ID, version: 1 },
      group_hash: groupHash,
      type: 'alert',
    })
  );

interface EventRow {
  groupHash: string;
  tsMs: number;
}

apiTest.describe('Rule events per-series cap (LIMIT BY)', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.alertingV2.ruleEvents.seed([
      ...seriesEvents(HOT_SERIES, HOT_EVENT_COUNT),
      ...QUIET_SERIES.flatMap((hash) => seriesEvents(hash, QUIET_EVENT_COUNT)),
    ]);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  const runQuery = async (esClient: EsClient, perSeriesLimit?: number): Promise<EventRow[]> => {
    const queryString = buildRuleEventsEsqlQuery({
      ruleId: RULE_ID,
      gteMs: GTE_MS,
      lteMs: LTE_MS,
      pageSize: 5000,
      groupHashes: [HOT_SERIES, ...QUIET_SERIES],
      perSeriesLimit,
    }).print('basic');

    const result = await esClient.esql.query({ query: queryString });
    const columns = result.columns ?? [];
    const groupHashIdx = columns.findIndex((c) => c.name === 'group_hash');
    const timestampIdx = columns.findIndex((c) => c.name === '@timestamp');

    return (result.values ?? []).map((row) => ({
      groupHash: row[groupHashIdx] as string,
      tsMs: Date.parse(row[timestampIdx] as string),
    }));
  };

  const countByHash = (rows: EventRow[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const { groupHash } of rows) {
      counts.set(groupHash, (counts.get(groupHash) ?? 0) + 1);
    }
    return counts;
  };

  apiTest('executes LIMIT ... BY group_hash against Elasticsearch', async ({ esClient }) => {
    // Default cap (500) exceeds every seeded series, so this purely proves the
    // engine accepts and runs the per-series LIMIT BY syntax.
    const rows = await runQuery(esClient);
    const counts = countByHash(rows);

    expect(counts.get(HOT_SERIES)).toBe(HOT_EVENT_COUNT);
    for (const hash of QUIET_SERIES) {
      expect(counts.get(hash)).toBe(QUIET_EVENT_COUNT);
    }
    expect(PER_SERIES_EVENT_LIMIT).toBeGreaterThan(HOT_EVENT_COUNT);
  });

  apiTest('caps the overactive series without starving quiet ones', async ({ esClient }) => {
    const rows = await runQuery(esClient, TEST_PER_SERIES_LIMIT);
    const counts = countByHash(rows);

    // Overactive series is capped at exactly the per-series limit.
    expect(counts.get(HOT_SERIES)).toBe(TEST_PER_SERIES_LIMIT);

    // Quiet series keep ALL their events -- they are not starved by the noisy
    // neighbour (the failure mode of the previous global-only LIMIT).
    for (const hash of QUIET_SERIES) {
      expect(counts.get(hash)).toBe(QUIET_EVENT_COUNT);
    }
  });

  apiTest(
    'keeps the most recent events per series (SORT DESC + LIMIT BY)',
    async ({ esClient }) => {
      const rows = await runQuery(esClient, TEST_PER_SERIES_LIMIT);
      const hotTimestamps = rows
        .filter((r) => r.groupHash === HOT_SERIES)
        .map((r) => r.tsMs)
        .sort((a, b) => a - b);

      expect(hotTimestamps).toHaveLength(TEST_PER_SERIES_LIMIT);

      // The kept events must be the newest ones: the oldest retained event is the
      // (HOT_EVENT_COUNT - TEST_PER_SERIES_LIMIT)-th seeded event.
      const expectedOldestKeptMs = BASE_MS + (HOT_EVENT_COUNT - TEST_PER_SERIES_LIMIT) * STEP_MS;
      expect(hotTimestamps[0]).toBe(expectedOldestKeptMs);
    }
  );
});
