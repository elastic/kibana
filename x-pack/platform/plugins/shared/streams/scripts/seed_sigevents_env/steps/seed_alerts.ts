/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext, SeededQuery } from '../types';
import { deterministicId } from '../types';

interface EsqlJsonResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Ensures `METADATA _id, _source` is present in the FROM clause.
 * Queries stored via the streams API already include this (it's required by the validator),
 * so in practice this is a no-op guard — it only injects if somehow absent.
 */
function ensureMetadataInFrom(esql: string): string {
  const trimmed = esql.trimStart();
  if (/METADATA\s+_id/i.test(trimmed)) {
    return trimmed;
  }
  const match = /^FROM\s+[^\n|]+/i.exec(trimmed);
  if (!match) {
    throw new Error(
      `seedAlerts: cannot inject METADATA — missing FROM clause in ESQL (prefix: ${esql.slice(
        0,
        120
      )})`
    );
  }
  return trimmed.replace(match[0], `${match[0]} METADATA _id, _source`);
}

function esqlRowsToObjects(
  columns: Array<{ name: string }> | undefined,
  values: unknown[][] | undefined
): Array<Record<string, unknown>> {
  if (!columns?.length || !values?.length) {
    return [];
  }
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj;
  });
}

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

  const bulkOps: Array<Record<string, unknown>> = [];

  // Single refresh before the loop — ensures all seedLogs documents are visible.
  // Use wildcard to cover all backing data stream indices, not just the write alias.
  await esClient.indices.refresh({ index: `${ctx.streamName}*` });

  for (const seededQuery of seededQueries) {
    const queryText = ensureMetadataInFrom(seededQuery.esql);

    const esqlResult = (await esClient.esql.query({
      query: queryText,
      filter: timeFilter,
    })) as unknown as EsqlJsonResult;

    const rows = esqlRowsToObjects(esqlResult.columns, esqlResult.values);

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
      const ts = row['@timestamp'];
      const timestamp =
        typeof ts === 'string'
          ? ts
          : ts instanceof Date
          ? ts.toISOString()
          : new Date(failureStartMs).toISOString();

      const srcObject =
        row._source && typeof row._source === 'object'
          ? (row._source as Record<string, unknown>)
          : {};
      const originalSource: Record<string, unknown> = { _id: logDocId, ...srcObject };

      const doc: Record<string, unknown> = {
        '@timestamp': timestamp,
        'kibana.alert.rule.uuid': seededQuery.ruleId,
        'kibana.alert.uuid': deterministicId(String(logDocId), seededQuery.ruleId),
        'kibana.alert.rule.name': seededQuery.title,
        'kibana.alert.rule.type.id': 'streams.rules.esql',
        'kibana.alert.rule.consumer': 'streams',
        'kibana.alert.rule.producer': 'streams',
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.instance.id': '*',
        'kibana.alert.start': new Date(failureStartMs).toISOString(),
        'kibana.alert.flapping': false,
        'kibana.alert.flapping_history': [],
        'kibana.space_ids': [ctx.space],
        'event.kind': 'signal',
        'event.action': 'active',
        original_source: originalSource,
      };

      bulkOps.push({
        index: {
          _index: '.alerts-streams.alerts-default',
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

  log.info(
    `seedAlerts: indexed ${
      bulkOps.length / 2
    } alert document(s) into .alerts-streams.alerts-default`
  );
}
