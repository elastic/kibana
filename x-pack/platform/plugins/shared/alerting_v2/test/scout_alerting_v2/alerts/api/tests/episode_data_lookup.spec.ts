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
  buildEpisodeDataRequest,
  buildEpisodeQuery,
  buildEpisodesDataRequest,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEvent } from '../../../../../server/resources/datastreams/alert_events';
import { apiTest, buildAlertEvent, buildGroupHash } from '../fixtures';

// Unique to this run, so the cleanup only deletes what this suite created.
const RUN_ID = randomUUID().slice(0, 8);
const RULE_ID = `episode-data-rule-${RUN_ID}`;
const SPACE_ID = 'default';

const NULL_DATA_EPISODE_ID = `null-data-${RUN_ID}`;
const RECOVERED_WITH_DATA_EPISODE_ID = `recovered-with-data-${RUN_ID}`;
const RECOVERED_EMPTY_EPISODE_ID = `recovered-empty-${RUN_ID}`;
const MISSING_EPISODE_ID = `missing-${RUN_ID}`;

const BASE_TIME = Date.now() - 10 * 60_000;
const timestampAt = (minute: number) => new Date(BASE_TIME + minute * 60_000).toISOString();

const buildEvent = (
  episodeId: string,
  minute: number,
  status: 'breached' | 'recovered',
  data: AlertEvent['data']
) =>
  buildAlertEvent({
    '@timestamp': timestampAt(minute),
    rule: { id: RULE_ID, version: 1 },
    group_hash: buildGroupHash(`episode-data-${episodeId}`),
    space_id: SPACE_ID,
    status,
    data,
    alert: { id: episodeId, status: status === 'breached' ? 'active' : 'inactive' },
  });

/** Rows of an ES|QL response as objects, so the specs can assert on the columns they care about. */
const toRows = ({
  columns,
  values,
}: {
  columns: Array<{ name: string }>;
  values: unknown[][];
}): Array<Record<string, unknown>> =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]])));

const runEsql = async (
  esClient: EsClient,
  query: string,
  filter?: Record<string, unknown>
): Promise<Array<Record<string, unknown>>> =>
  toRows(await esClient.esql.query({ query, filter, format: 'json' }));

const runEpisodeDataRequest = async (esClient: EsClient, episodeId: string) => {
  const { query, filter } = buildEpisodeDataRequest(SPACE_ID, episodeId);
  return runEsql(esClient, query.print('basic'), filter);
};

const parseData = (row: Record<string, unknown> | undefined) =>
  JSON.parse(String(row?.episode_data));

apiTest.describe('Episode data lookup', { tag: '@local-stateful-classic' }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: RULE_ID });
    await apiServices.alertingV2.ruleEvents.seed([
      // The newest breached event only holds null values, which index nothing.
      buildEvent(NULL_DATA_EPISODE_ID, 1, 'breached', { 'host.name': 'web-01' }),
      buildEvent(NULL_DATA_EPISODE_ID, 2, 'breached', { a: null }),
      buildEvent(NULL_DATA_EPISODE_ID, 3, 'recovered', {}),
      // The recovery event carries its own data.
      buildEvent(RECOVERED_WITH_DATA_EPISODE_ID, 1, 'breached', { 'host.name': 'web-01' }),
      buildEvent(RECOVERED_WITH_DATA_EPISODE_ID, 2, 'recovered', { 'host.name': 'web-02' }),
      // The recovery event has no data, so the breached one is the latest with data.
      buildEvent(RECOVERED_EMPTY_EPISODE_ID, 1, 'breached', { 'host.name': 'web-01' }),
      buildEvent(RECOVERED_EMPTY_EPISODE_ID, 2, 'recovered', {}),
    ]);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId: RULE_ID });
  });

  apiTest(
    'picks the newest breached event, even when its data only holds nulls',
    async ({ esClient }) => {
      const [row] = await runEpisodeDataRequest(esClient, NULL_DATA_EPISODE_ID);

      expect(row['@timestamp']).toBe(timestampAt(2));
      expect(parseData(row)).toStrictEqual({ a: null });
    }
  );

  apiTest('picks a newest recovered event that has data', async ({ esClient }) => {
    const [row] = await runEpisodeDataRequest(esClient, RECOVERED_WITH_DATA_EPISODE_ID);

    expect(row['@timestamp']).toBe(timestampAt(2));
    expect(parseData(row)).toStrictEqual({ 'host.name': 'web-02' });
  });

  apiTest(
    'skips a newest recovered event without data, and the episode row shows the data is older',
    async ({ esClient }) => {
      const [row] = await runEpisodeDataRequest(esClient, RECOVERED_EMPTY_EPISODE_ID);
      const [episode] = await runEsql(
        esClient,
        buildEpisodeQuery(SPACE_ID, RECOVERED_EMPTY_EPISODE_ID).print('basic')
      );

      expect(row['@timestamp']).toBe(timestampAt(1));
      expect(parseData(row)).toStrictEqual({ 'host.name': 'web-01' });
      expect(episode.last_timestamp).toBe(timestampAt(2));
    }
  );

  apiTest('returns no rows for an episode without events', async ({ esClient }) => {
    const dataRows = await runEpisodeDataRequest(esClient, MISSING_EPISODE_ID);
    const episodeRows = await runEsql(
      esClient,
      buildEpisodeQuery(SPACE_ID, MISSING_EPISODE_ID).print('basic')
    );

    expect(dataRows).toHaveLength(0);
    expect(episodeRows).toHaveLength(0);
  });

  apiTest('returns the latest data of each episode in one request', async ({ esClient }) => {
    const { query, filter } = buildEpisodesDataRequest(SPACE_ID, [
      NULL_DATA_EPISODE_ID,
      RECOVERED_WITH_DATA_EPISODE_ID,
      RECOVERED_EMPTY_EPISODE_ID,
      MISSING_EPISODE_ID,
    ]);
    const rows = await runEsql(esClient, query.print('basic'), filter);

    const dataByEpisodeId = Object.fromEntries(
      rows.map((row) => [row['episode.id'], parseData(row)])
    );
    expect(dataByEpisodeId).toStrictEqual({
      [NULL_DATA_EPISODE_ID]: { a: null },
      [RECOVERED_WITH_DATA_EPISODE_ID]: { 'host.name': 'web-02' },
      [RECOVERED_EMPTY_EPISODE_ID]: { 'host.name': 'web-01' },
    });
  });
});
