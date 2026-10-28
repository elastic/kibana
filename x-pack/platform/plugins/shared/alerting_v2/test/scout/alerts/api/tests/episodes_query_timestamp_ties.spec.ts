/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import {
  buildEpisodeQuery,
  buildEpisodesQuery,
  PAGE_SIZE_ESQL_VARIABLE,
} from '@kbn/alerting-v2-common-queries';
import { apiTest, buildAlertEvent, buildGroupHash } from '../fixtures';

// The rule id is unique to this run, so the cleanup hooks only remove what this suite created.
const RUN_ID = randomUUID().slice(0, 8);
const RULE_ID = `timestamp-ties-rule-${RUN_ID}`;
const GROUP_HASH = buildGroupHash(`timestamp-ties-group-${RUN_ID}`);
const EPISODE_ID = `timestamp-ties-episode-${RUN_ID}`;
const SPACE_ID = 'default';
const TIED_EVENTS_COUNT = 5;

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
  toRows(
    await esClient.esql.query({
      query,
      format: 'json',
      params: [{ [PAGE_SIZE_ESQL_VARIABLE]: 100 }],
    })
  );

apiTest.describe(
  'Episodes query when the latest events of an episode share a timestamp',
  { tag: '@local-stateful-classic' },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: RULE_ID });

      // A rule run without grouping writes one event per result row, all under the same
      // episode and with the same timestamp.
      const now = Date.now();
      const latestTimestamp = new Date(now).toISOString();
      const buildEvent = (timestamp: string, pod: string) =>
        buildAlertEvent({
          '@timestamp': timestamp,
          scheduled_timestamp: timestamp,
          rule: { id: RULE_ID, version: 1 },
          group_hash: GROUP_HASH,
          source: 'internal',
          data: { 'k8s.pod.name': pod },
          alert: { id: EPISODE_ID, status: 'active' },
        });

      await apiServices.alertingV2.ruleEvents.seed([
        buildEvent(new Date(now - 60_000).toISOString(), 'pod-previous-run'),
        ...Array.from({ length: TIED_EVENTS_COUNT }, (_, index) =>
          buildEvent(latestTimestamp, `pod-${index}`)
        ),
      ]);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: RULE_ID });
    });

    apiTest('the list query returns one row for the episode', async ({ esClient }) => {
      const rows = await runEsql(
        esClient,
        buildEpisodesQuery(SPACE_ID, undefined, { ruleId: RULE_ID }).print('basic')
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ 'episode.id': EPISODE_ID, 'rule.id': RULE_ID });
    });

    apiTest('the single episode query returns one row for the episode', async ({ esClient }) => {
      const rows = await runEsql(esClient, buildEpisodeQuery(SPACE_ID, EPISODE_ID).print('basic'));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ 'episode.id': EPISODE_ID });
    });
  }
);
