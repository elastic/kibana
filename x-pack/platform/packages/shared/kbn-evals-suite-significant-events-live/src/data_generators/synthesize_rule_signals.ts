/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CanonicalRuleQuery } from '../scenarios/types';
import { RULE_EVENTS_DATA_STREAM } from './wipe_pipeline_data';

/** Matches the critical-cadence rule interval — one evaluation window per minute. */
export const SIGNAL_BUCKET_INTERVAL_MINUTES = 1;

export interface RuleSignalStats {
  /** Signals written per rule_uuid (one per bucket-with-hits). */
  signalsByRule: Record<string, number>;
  total: number;
}

interface BucketRow {
  bucket: string;
  hits: number;
}

const bucketRowsFromEsqlResponse = (columns: Array<{ name: string }>, values: unknown[][]) => {
  const bucketIdx = columns.findIndex((column) => column.name === 'bucket');
  const hitsIdx = columns.findIndex((column) => column.name === 'hits');
  if (bucketIdx === -1 || hitsIdx === -1) {
    throw new Error(
      `Unexpected ES|QL columns for signal synthesis: ${columns.map((c) => c.name).join(', ')}`
    );
  }
  return values
    .map((row): BucketRow => ({ bucket: String(row[bucketIdx]), hits: Number(row[hitsIdx]) }))
    .filter((row) => row.hits > 0 && row.bucket !== 'null');
};

/**
 * Approximate rule firing over the replayed window without running real Alerting rules: for each
 * canonical rule-backed query, bucket its ES|QL hits per minute and write one `breached` signal
 * document per bucket-with-hits into `.rule-events`.
 *
 * Known simplification: real rule executions write one signal PER MATCHING ROW (grouping by
 * `_id`), so production series carry error volume; this synthesizer emits a binary 0/1 series
 * per rule, compressing amplitude — a 1000x error flood and one error per minute look identical
 * to the change-point scan, and intermittent errors (alternating buckets) read weaker than they
 * would in production. Sufficient for spike/step transitions on quiet baselines, which is what
 * the seeded scenarios exercise.
 *
 * Signal doc shape mirrors `alertEventSchema` in
 * `x-pack/platform/plugins/shared/alerting_v2/server/resources/datastreams/alert_events.ts`
 * (see also the product seed script `significant_events/scripts/seed_sigevents_env/steps/seed_alerts.ts`).
 * If signal writes start failing or the change-point scan stops seeing them, check that file
 * for drift first.
 */
export async function synthesizeRuleSignals(
  esClient: Client,
  log: ToolingLog,
  {
    queries,
    spaceId = 'default',
  }: {
    queries: CanonicalRuleQuery[];
    spaceId?: string;
  }
): Promise<RuleSignalStats> {
  const signalsByRule: Record<string, number> = {};
  const operations: Array<Record<string, unknown>> = [];

  for (const query of queries) {
    signalsByRule[query.rule_uuid] = 0;

    const bucketedQuery =
      `${query.esql} | STATS hits = COUNT(*) BY bucket = BUCKET(@timestamp, ` +
      `${SIGNAL_BUCKET_INTERVAL_MINUTES} minute) | SORT bucket ASC`;

    let rows: BucketRow[];
    try {
      const response = await esClient.esql.query({ query: bucketedQuery });
      rows = bucketRowsFromEsqlResponse(
        response.columns as Array<{ name: string }>,
        response.values as unknown[][]
      );
    } catch (error) {
      throw new Error(
        `Signal synthesis ES|QL failed for "${query.title}" (${query.rule_uuid}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (rows.length === 0) {
      log.debug(
        `synthesizeRuleSignals: "${query.title}" matched no buckets — no signals for this rule`
      );
      continue;
    }

    for (const row of rows) {
      const timestamp = new Date(row.bucket).toISOString();
      operations.push(
        { create: { _index: RULE_EVENTS_DATA_STREAM } },
        {
          '@timestamp': timestamp,
          scheduled_timestamp: timestamp,
          rule: { id: query.rule_uuid, version: 1 },
          // Stable per rule: the scan's cardinality metric is per-rule display only; the
          // change_point series reads raw doc counts.
          group_hash: `replay-${query.rule_uuid}`,
          data: { hits: row.hits, bucket: timestamp, query_title: query.title },
          status: 'breached',
          source: 'internal',
          type: 'signal',
          space_id: spaceId,
        }
      );
      signalsByRule[query.rule_uuid] += 1;
    }

    log.info(
      `synthesizeRuleSignals: "${query.title}" -> ${
        signalsByRule[query.rule_uuid]
      } signal bucket(s)`
    );
  }

  if (operations.length === 0) {
    log.warning('synthesizeRuleSignals: no query matched any logs — no signals written');
    return { signalsByRule, total: 0 };
  }

  const response = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (response.errors) {
    const failures = response.items
      .filter((item) => item.create?.error)
      .slice(0, 5)
      .map((item) => JSON.stringify(item.create?.error));
    throw new Error(
      `Failed to write synthetic signals into ${RULE_EVENTS_DATA_STREAM}: ${failures.join('; ')}`
    );
  }

  const total = operations.length / 2;
  log.info(`synthesizeRuleSignals: wrote ${total} signal(s) into ${RULE_EVENTS_DATA_STREAM}`);
  return { signalsByRule, total };
}
