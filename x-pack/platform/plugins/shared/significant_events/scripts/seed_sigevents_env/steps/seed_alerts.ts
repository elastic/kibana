/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { ensureMetadata } from '@kbn/streams-schema';
import type { SeedContext, SeededQuery } from '../types';
import { deterministicId } from '../types';

export async function seedAlerts(
  ctx: SeedContext,
  seededQueries: SeededQuery[],
  failureStartMs: number,
  failureEndMs: number,
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  const timeFilter = {
    range: {
      '@timestamp': {
        gte: new Date(failureStartMs).toISOString(),
        lte: new Date(failureEndMs).toISOString(),
      },
    },
  };

  const bulkOps: Array<BulkOperationContainer | Record<string, unknown>> = [];

  // Single refresh before the loop — ensures all seedLogs documents are visible.
  // Use wildcard to cover all backing data stream indices, not just the write alias.
  await esClient.indices.refresh({ index: `${ctx.streamName}*` });

  for (const seededQuery of seededQueries) {
    const queryText = ensureMetadata(seededQuery.esql);

    const esqlResult = await esClient.esql.query({
      query: queryText,
      filter: timeFilter,
    });

    const rows = esqlResult.values.map((row) =>
      Object.fromEntries(esqlResult.columns.map((col, i) => [col.name, row[i]]))
    );

    if (rows.length === 0) {
      log.warning(
        `seedAlerts: "${seededQuery.title}" matched 0 rows in failure window — skipping alert generation for this query. ` +
          `Possible causes: log template drift, time range mismatch, or refresh timing.`
      );
      continue;
    }

    log.info(
      `seedAlerts: "${seededQuery.title}" matched ${rows.length} log row(s) in failure window (rule ${seededQuery.ruleId})`
    );

    let indexedForQuery = 0;
    for (const row of rows) {
      const logDocId = String(row._id ?? '');
      if (!logDocId) {
        log.warning(`seedAlerts: skipping row without _id for query "${seededQuery.title}"`);
        continue;
      }
      indexedForQuery += 1;

      const alertDocId = deterministicId(logDocId, seededQuery.ruleId, ctx.space);
      const timestamp = row['@timestamp'] || new Date(failureStartMs).toISOString();

      const originalSource = {
        _id: logDocId,
        ...(typeof row._source === 'object' && row._source !== null ? row._source : {}),
      };

      const doc = {
        '@timestamp': timestamp,
        scheduled_timestamp: timestamp,
        rule: {
          id: seededQuery.ruleId,
          version: 1,
        },
        group_hash: deterministicId(logDocId, seededQuery.ruleId),
        data: originalSource,
        status: 'breached',
        source: 'internal',
        type: 'signal',
        space_id: ctx.space,
      };

      bulkOps.push({
        index: {
          _index: '.rule-events',
          _id: alertDocId,
        },
      });
      bulkOps.push(doc);
    }

    if (indexedForQuery === 0) {
      throw new Error(
        `ESQL returned rows for '${seededQuery.title}' but none had _id — possible causes: METADATA _id not applied, or field mapping drift`
      );
    }
  }

  if (bulkOps.length === 0) {
    log.warning('seedAlerts: no alert documents were produced — all queries matched zero rows');
    return;
  }

  const res = await esClient.bulk({ operations: bulkOps, refresh: 'wait_for' });
  if (res.errors) {
    const failedItems = res.items.filter((item) => item.index?.error).slice(0, 5);
    const reasons = failedItems.map((item) => JSON.stringify(item.index?.error)).join('; ');
    throw new Error(`Alert bulk indexing failed (${failedItems.length} item(s)): ${reasons}`);
  }

  log.info(`seedAlerts: indexed ${bulkOps.length / 2} alert event(s) into .rule-events`);
}
