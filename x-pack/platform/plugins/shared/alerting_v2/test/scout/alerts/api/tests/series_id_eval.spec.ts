/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { EVENTS_SERIES_ID_EVAL } from '@kbn/alerting-v2-common-queries';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { decodeSeriesId, encodeSeriesId } from '@kbn/alerting-v2-utils';
import type { AlertEvent } from '../../../../../server/resources/datastreams/alert_events';
import { apiTest, buildAlertEvent, buildExternalAlertEvent, buildGroupHash } from '../fixtures';

// Every group hash is unique to this run, so each case reads back exactly its own document and
// the cleanup deletes only what this suite seeded instead of wiping the shared data stream.
const RUN_ID = randomUUID().slice(0, 8);
const SPACE_ID = 'default';

interface EvalCase {
  name: string;
  event: AlertEvent;
}

const groupHashFor = (label: string) => buildGroupHash(`series-eval-${RUN_ID}-${label}`);

// `buildAlertEvent` defaults to the external source `scout-test`, so the rule-backed cases set
// their source explicitly. Cases that bypass the ingest schema (`source: ''`) are seeded directly.
const cases: EvalCase[] = [
  {
    name: 'a rule-backed series (source "internal")',
    event: buildAlertEvent({
      rule: { id: `series-eval-rule-${RUN_ID}`, version: 1 },
      source: 'internal',
      group_hash: groupHashFor('rule'),
    }),
  },
  {
    name: 'an external source',
    event: buildExternalAlertEvent({ source: 'pagerduty', group_hash: groupHashFor('source') }),
  },
  {
    name: 'an external source containing the separator',
    event: buildExternalAlertEvent({
      source: 'pager::duty',
      group_hash: groupHashFor('source-separator'),
    }),
  },
  {
    name: 'an external source ending in a colon',
    event: buildExternalAlertEvent({
      source: 'pagerduty:',
      group_hash: groupHashFor('source-colon'),
    }),
  },
  {
    name: 'an external source with non-ASCII characters',
    event: buildExternalAlertEvent({
      source: 'zürich-🚀-東京',
      group_hash: groupHashFor('source-unicode'),
    }),
  },
  {
    name: 'an external source of the maximum length',
    event: buildExternalAlertEvent({
      source: 'a'.repeat(150),
      group_hash: groupHashFor('source-max'),
    }),
  },
  {
    // An empty source is never an external owner: it is rule-backed, like a missing one.
    name: 'an empty source with a rule id',
    event: buildAlertEvent({
      rule: { id: `series-eval-empty-source-rule-${RUN_ID}`, version: 1 },
      source: '',
      group_hash: groupHashFor('empty-source-rule'),
    }),
  },
  {
    name: 'an empty source without a rule id, which has no series id',
    event: buildExternalAlertEvent({ source: '', group_hash: groupHashFor('empty-source') }),
  },
  {
    name: 'the "internal" source without a rule id, which has no series id',
    event: buildExternalAlertEvent({
      source: 'internal',
      group_hash: groupHashFor('internal-no-rule'),
    }),
  },
];

const toSeriesRef = (event: AlertEvent) => ({
  space_id: event.space_id,
  group_hash: event.group_hash,
  rule_id: event.rule?.id,
  source: event.source,
});

const readSeriesId = async (esClient: EsClient, groupHash: string): Promise<string | null> => {
  const { columns, values } = await esClient.esql.query({
    query: `FROM ${ALERT_EVENTS_DATA_STREAM} | WHERE space_id == "${SPACE_ID}" AND group_hash == "${groupHash}" | ${EVENTS_SERIES_ID_EVAL} | KEEP series_id`,
    format: 'json',
  });
  expect(values).toHaveLength(1);

  const seriesIdIndex = columns.findIndex(({ name }) => name === 'series_id');
  return (values[0][seriesIdIndex] as string | null) ?? null;
};

apiTest.describe('SERIES_ID_EVAL agrees with encodeSeriesId', { tag: tags.stateful.all }, () => {
  const seededGroupHashes = cases.map(({ event }) => event.group_hash);

  const deleteSeededEvents = (esClient: EsClient) =>
    esClient.deleteByQuery(
      {
        index: ALERT_EVENTS_DATA_STREAM,
        query: { terms: { group_hash: seededGroupHashes } },
        refresh: true,
        conflicts: 'proceed',
      },
      { ignore: [404] }
    );

  apiTest.beforeAll(async ({ apiServices, esClient }) => {
    await deleteSeededEvents(esClient);
    await apiServices.alertingV2.ruleEvents.seed(cases.map(({ event }) => event));
  });

  apiTest.afterAll(async ({ esClient }) => {
    await deleteSeededEvents(esClient);
  });

  for (const { name, event } of cases) {
    apiTest(`produces the same series id as encodeSeriesId for ${name}`, async ({ esClient }) => {
      // `encodeSeriesId` is the oracle for the id format; the ES|QL expression must reproduce
      // it byte for byte, `null` included.
      const expected = encodeSeriesId(toSeriesRef(event));

      const seriesId = await readSeriesId(esClient, event.group_hash);

      expect(seriesId).toBe(expected);

      // And the id the query hands out decodes back to the series it came from.
      const decoded = seriesId === null ? null : decodeSeriesId(seriesId);
      expect(
        decoded && { space_id: decoded.space_id, group_hash: decoded.group_hash }
      ).toStrictEqual(
        expected === null ? null : { space_id: SPACE_ID, group_hash: event.group_hash }
      );
    });
  }
});
