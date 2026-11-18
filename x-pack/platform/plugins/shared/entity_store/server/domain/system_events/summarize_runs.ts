/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
import { getExtractionRunsDataStreamName } from '../../../common/domain/system_events';
import type { EntityType, ExtractionMode } from '../../../common/domain/definitions/entity_schema';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import type { SystemEventsWriter } from './system_events_writer';
import type { SystemEventDoc } from './types';
import { SYSTEM_EVENT_ACTION, SYSTEM_EVENT_REASON } from './types';

/** Raw extraction runs live up to 4 days, so only the last 3 complete days can be summarized. */
const DAYS_TO_SUMMARIZE = 3;
const LAST_ERRORS_LIMIT = 500;

type Row = Record<string, unknown>;

const toRows = ({ columns, values }: ESQLSearchResponse): Row[] =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, i) => [name, row[i]])));

const keyOf = (entityType: unknown, mode: unknown) => `${entityType}:${mode}`;

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
const toNullableMs = (value: unknown): number | null =>
  typeof value === 'number' ? Math.round(value) : null;

export const getSummaryDocId = (day: string, entityType: string, mode: string) =>
  `${day}:${SYSTEM_EVENT_ACTION.extraction}:${entityType}:${mode}`;

const buildStatsQuery = (index: string, from: string, to: string) => `FROM ${index}
| WHERE @timestamp >= "${from}" AND @timestamp < "${to}"
| EVAL is_failure = CASE(event.outcome == "failure", 1, 0),
    is_aborted = CASE(event.reason == "${SYSTEM_EVENT_REASON.aborted}", 1, 0),
    is_capped = CASE(entity_store.extraction.logs_cap_applied == true, 1, 0),
    duration_ms = event.duration / 1000000.0
| STATS runs = COUNT(*),
    failures = SUM(is_failure),
    aborted = SUM(is_aborted),
    entities = SUM(entity_store.extraction.count),
    logs_processed = SUM(entity_store.extraction.logs_processed),
    cap_applied_runs = SUM(is_capped),
    duration_p50_ms = PERCENTILE(duration_ms, 50),
    duration_p95_ms = PERCENTILE(duration_ms, 95),
    duration_max_ms = MAX(duration_ms)
  BY entity_store.entity_type, entity_store.mode`;

const buildLastErrorsQuery = (index: string, from: string, to: string) => `FROM ${index}
| WHERE @timestamp >= "${from}" AND @timestamp < "${to}" AND event.outcome == "failure"
| SORT @timestamp DESC
| KEEP entity_store.entity_type, entity_store.mode, error.message
| LIMIT ${LAST_ERRORS_LIMIT}`;

/**
 * Compacts raw extraction runs into one summary doc per complete UTC day, entity type and
 * mode. Summary ids are deterministic and written with `op_type: create`, so days that are
 * already summarized (by this or another Kibana node) are skipped.
 */
export const summarizeExtractionRuns = async ({
  esClient,
  writer,
  namespace,
  logger,
  now = new Date(),
}: {
  esClient: ElasticsearchClient;
  writer: SystemEventsWriter;
  namespace: string;
  logger: Logger;
  now?: Date;
}): Promise<{ written: number }> => {
  const index = getExtractionRunsDataStreamName(namespace);
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    return { written: 0 };
  }

  const today = moment.utc(now).startOf('day');
  let written = 0;

  for (let daysAgo = DAYS_TO_SUMMARIZE; daysAgo >= 1; daysAgo--) {
    const dayStart = today.clone().subtract(daysAgo, 'days');
    const from = dayStart.toISOString();
    const to = dayStart.clone().add(1, 'day').toISOString();
    const day = dayStart.format('YYYY-MM-DD');

    const stats = toRows(
      await executeEsqlQuery({ esClient, query: buildStatsQuery(index, from, to) })
    );
    if (stats.length === 0) {
      continue;
    }

    const lastErrors = new Map<string, string>();
    if (stats.some((row) => toNumber(row.failures) > 0)) {
      const errors = toRows(
        await executeEsqlQuery({ esClient, query: buildLastErrorsQuery(index, from, to) })
      );
      for (const row of errors) {
        const key = keyOf(row['entity_store.entity_type'], row['entity_store.mode']);
        if (!lastErrors.has(key) && typeof row['error.message'] === 'string') {
          lastErrors.set(key, row['error.message']);
        }
      }
    }

    for (const row of stats) {
      const entityType = row['entity_store.entity_type'] as EntityType;
      const mode = row['entity_store.mode'] as ExtractionMode;
      const lastError = lastErrors.get(keyOf(entityType, mode));
      const doc: SystemEventDoc = {
        '@timestamp': from,
        event: { kind: 'summary', action: SYSTEM_EVENT_ACTION.extraction },
        entity_store: {
          namespace,
          entity_type: entityType,
          mode,
          summary: {
            runs: toNumber(row.runs),
            failures: toNumber(row.failures),
            aborted: toNumber(row.aborted),
            entities: toNumber(row.entities),
            logs_processed: toNumber(row.logs_processed),
            cap_applied_runs: toNumber(row.cap_applied_runs),
            duration_p50_ms: toNullableMs(row.duration_p50_ms),
            duration_p95_ms: toNullableMs(row.duration_p95_ms),
            duration_max_ms: toNullableMs(row.duration_max_ms),
            ...(lastError ? { last_error: lastError } : {}),
          },
        },
      };
      if (await writer.writeEvent(doc, getSummaryDocId(day, entityType, mode))) {
        written++;
      }
    }
  }

  if (written > 0) {
    logger.debug(`Wrote ${written} extraction summary docs for namespace "${namespace}"`);
  }
  return { written };
};
