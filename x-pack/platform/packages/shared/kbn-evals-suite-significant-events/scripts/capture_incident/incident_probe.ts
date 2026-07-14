/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { QueryDsl } from './incident_config';

// Probe searches can run for minutes when the source is on the frozen (`partial-`)
// tier (a single search thaws blobs from object storage), so allow a generous
// per-request timeout.
const PROBE_REQUEST_TIMEOUT_MS = 8 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
// Cap on how many distinct entity values (e.g. nodes) to scope the snapshot by.
// Taken in descending symptom-volume order, so the most-affected entities win.
const MAX_ENTITY_VALUES = 15;

// Datasets that are high-volume and low-signal for reproducing an incident (GC
// logs, HTTP access/proxy noise, bootstrap logs). When they are NOT where the
// symptom lives, they are excluded from the reindex so the snapshot keeps the
// meaningful noise without ballooning in size. Matched as substrings of
// `data_stream.dataset`.
const NOISY_DATASET_SUBSTRINGS = ['elasticsearch.gc', 'proxy.log', 'bootstrap_logs'];

/** Time window as ISO-8601 strings. */
export interface TimeRange {
  gte: string;
  lt: string;
}

/** Result of anchoring the window + resolving the entity against the Overview source. */
export interface ProbeResult {
  timeRange: TimeRange;
  /** The broad snapshot query (a `terms` on the entity field over the discovered values). */
  snapshotQuery: QueryDsl;
  /** `data_stream.dataset` names dropped from the reindex (oversized / low-signal). */
  excludedDatasets: string[];
  /** Symptom hits that fall inside the window (informational). */
  expectedSymptomDocCount: number;
  /** Reindex total: entity-scoped docs within `timeRange`, AFTER excludes. */
  expectedDocCount: number;
}

/** Builds an ES client for the Overview source cluster from a URL + optional API key. */
export function createOverviewClient(esUrl: string, apiKey?: string): Client {
  const { protocol, host, pathname, username, password } = new URL(esUrl);
  return new Client({
    node: `${protocol}//${host}${pathname}`,
    auth: apiKey ? { apiKey } : username && password ? { username, password } : undefined,
  });
}

/** Wraps one or more filter clauses with a `@timestamp` range in a `bool.filter`. */
function withTimeRange(timeRange: TimeRange, ...filters: QueryDsl[]): QueryDslQueryContainer {
  return {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: timeRange.gte, lt: timeRange.lt } } },
        ...(filters as QueryDslQueryContainer[]),
      ],
    },
  };
}

/** ISO-8601 without milliseconds (matches the hand-written config style). */
function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function bucketList(
  aggregations: Record<string, unknown> | undefined,
  name: string
): Array<{ key: string; count: number }> {
  const buckets =
    (aggregations?.[name] as { buckets?: Array<{ key: string | number; doc_count: number }> })
      ?.buckets ?? [];
  return buckets.map((bucket) => ({ key: String(bucket.key), count: bucket.doc_count }));
}

/** Entity-scoped total + per-dataset breakdown within the window. */
async function entitySlice(esClient: Client, index: string, query: QueryDslQueryContainer) {
  const response = await esClient.search(
    {
      index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: true,
      query,
      aggs: { datasets: { terms: { field: 'data_stream.dataset', size: 200 } } },
    },
    { requestTimeout: PROBE_REQUEST_TIMEOUT_MS }
  );
  const total = response.hits.total;
  return {
    total: typeof total === 'number' ? total : total?.value ?? 0,
    datasets: bucketList(
      response.aggregations as Record<string, unknown> | undefined,
      'datasets'
    ).map((entry) => ({ dataset: entry.key, count: entry.count })),
  };
}

const isNoisyDataset = (dataset: string): boolean =>
  NOISY_DATASET_SUBSTRINGS.some((needle) => dataset.includes(needle));

/**
 * Resolves the capture against the Overview SOURCE cluster (the cluster the
 * reindex actually pulls from), because the investigating Agent Builder runs on a
 * DIFFERENT cluster where environment-specific values (e.g. `host.name` node
 * names) do not match. It:
 *
 *  1. Searches the (portable) symptom over the wide `searchWindow` for its
 *     first/last `@timestamp` and the distinct values of the agent's `entityField`
 *     that emitted the symptom.
 *  2. Anchors `timeRange = [first - 1h, last + 1h]`.
 *  3. Scopes the broad snapshot by those entity values.
 *  4. Drops fixed noisy / low-signal datasets that do NOT carry the symptom.
 */
export async function probeOverview({
  esClient,
  log,
  sourceIndex,
  searchWindow,
  symptom,
  entityField,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string[];
  searchWindow: TimeRange;
  symptom: QueryDsl;
  entityField: string;
}): Promise<ProbeResult> {
  const index = sourceIndex.join(',');

  // 1. Locate the symptom span + the affected entity values.
  log.info(
    `Probing Overview source "${index}" for the symptom span + affected ${entityField} ` +
      `within ${searchWindow.gte}..${searchWindow.lt}`
  );
  const symptomProbe = await esClient.search(
    {
      index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: true,
      query: withTimeRange(searchWindow, symptom),
      aggs: {
        first: { min: { field: '@timestamp' } },
        last: { max: { field: '@timestamp' } },
        entities: { terms: { field: entityField, size: MAX_ENTITY_VALUES } },
      },
    },
    { requestTimeout: PROBE_REQUEST_TIMEOUT_MS }
  );

  const totalHits = symptomProbe.hits.total;
  const symptomHitsInWindow = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
  const firstMs = (symptomProbe.aggregations?.first as { value?: number | null })?.value ?? null;
  const lastMs = (symptomProbe.aggregations?.last as { value?: number | null })?.value ?? null;
  const aggs = symptomProbe.aggregations as Record<string, unknown> | undefined;
  const entityValues = bucketList(aggs, 'entities').map((entry) => entry.key);

  // 2. Anchor the capture window on the symptom timestamps (±1h).
  let timeRange: TimeRange;
  if (symptomHitsInWindow > 0 && firstMs !== null && lastMs !== null) {
    timeRange = { gte: toIso(firstMs - ONE_HOUR_MS), lt: toIso(lastMs + ONE_HOUR_MS) };
    log.info(
      `Symptom span: ${symptomHitsInWindow} hit(s) from ${toIso(firstMs)} to ${toIso(lastMs)} ` +
        `-> window ${timeRange.gte}..${timeRange.lt}`
    );
  } else {
    timeRange = searchWindow;
    log.warning(
      `Symptom matched 0 docs on the Overview source within the search window — the symptom ` +
        `query does not match this cluster. Verify it in the derived config before capturing.`
    );
  }

  // 3. Scope the snapshot by the agent's entity field over the discovered values.
  const snapshotQuery: QueryDsl = { terms: { [entityField]: entityValues } };
  log.info(`Entity scope "${entityField}": ${entityValues.length} value(s) from the symptom hits.`);
  if (entityValues.length === 0) {
    log.warning(
      `No "${entityField}" values found on the symptom hits — the snapshot query will match ` +
        `nothing. Review the symptom / entity field in the derived config.`
    );
  }

  // 4. The reindex captures the entity scope UNION the symptom, so EVERY symptom
  //    doc lands in the snapshot even when it sits on an entity outside the scope
  //    (invariant: symptom ⊆ snapshot). Break that union down per dataset, then drop
  //    fixed noisy datasets — but NEVER one that carries symptom docs.
  const hasSymptom = Boolean(symptom && Object.keys(symptom).length > 0);
  const reindexScope: QueryDsl = hasSymptom
    ? { bool: { should: [snapshotQuery, symptom], minimum_should_match: 1 } }
    : snapshotQuery;
  const snapshotSlice = await entitySlice(esClient, index, withTimeRange(timeRange, reindexScope));

  // Datasets that hold ANY symptom doc in the window — protected from exclusion so
  // the symptom is never dropped from the capture.
  const symptomByDataset = await entitySlice(esClient, index, withTimeRange(timeRange, symptom));
  const symptomDatasets = new Set(
    symptomByDataset.datasets.filter((entry) => entry.count > 0).map((entry) => entry.dataset)
  );

  const { datasets } = snapshotSlice;
  const excludedDatasets = datasets
    .filter((entry) => !symptomDatasets.has(entry.dataset) && isNoisyDataset(entry.dataset))
    .map((entry) => entry.dataset);

  const excludedSet = new Set(excludedDatasets);
  const includedEntries = datasets.filter((entry) => !excludedSet.has(entry.dataset));
  const expectedDocCount = includedEntries.reduce((sum, entry) => sum + entry.count, 0);
  // All symptom-carrying datasets are protected/included, so every in-window symptom
  // doc is captured. When 0 hits fell in the wide search window, `timeRange` falls
  // back to that same window, so the in-window count is authoritative either way.
  const expectedSymptomDocCount = symptomHitsInWindow;

  if (snapshotSlice.total > 0) {
    log.info(
      `Overview probe: reindex scope (${entityField}=${entityValues.length} value(s) ∪ symptom) = ` +
        `${snapshotSlice.total} docs across ${datasets.length} dataset(s); ` +
        `${expectedDocCount} after excludes; ${expectedSymptomDocCount} symptom hit(s) captured. ` +
        `Datasets: ${datasets.map((e) => `${e.dataset}(${e.count})`).join(', ') || 'none'}`
    );
    if (excludedDatasets.length > 0) {
      log.info(`Excluding noisy / low-signal datasets: ${excludedDatasets.join(', ')}`);
    }
  }

  return {
    timeRange,
    snapshotQuery,
    excludedDatasets,
    expectedSymptomDocCount,
    expectedDocCount,
  };
}
