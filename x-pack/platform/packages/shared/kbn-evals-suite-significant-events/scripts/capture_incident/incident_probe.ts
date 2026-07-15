/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { QueryDsl } from './incident_config';
import { ENTITY_FIELDS, MAX_REINDEX_DOCS } from './constants';
import { toIso } from './incident_utils';

/**
 * Gap threshold for splitting symptom hits into clusters. Hits separated by more
 * than this start a new cluster; the densest cluster seeds the adaptive window.
 */
const SYMPTOM_CLUSTER_GAP_MS = 60 * 60 * 1000;

/**
 * Fixed histogram bucket width for the adaptive window. Greedy expansion stops when
 * the next bucket would push the running total over `MAX_REINDEX_DOCS`.
 */
const WINDOW_HISTOGRAM_INTERVAL = '5m';
const WINDOW_HISTOGRAM_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A symptom-free dataset that alone accounts for at least this fraction of the full
 * scope is always dropped BEFORE sizing the window (dominance-gated noise removal).
 * Dropping first lets the budget stretch over more time rather than being consumed
 * by bulk noise such as proxy.log or elasticsearch.gc.
 */
const NOISE_DROP_DOMINANCE_PCT = 10;

/**
 * Upper bound on distinct entity values the snapshot scope will broaden by. Above
 * this the field is too broad to be a controllable scope, so it is skipped.
 */
const MAX_ENTITY_VALUES = 50;

const CAPTURE_DOC_BUDGET = 500_000;

/** Time window as ISO-8601 strings. */
export interface TimeRange {
  gte: string;
  lt: string;
}

/** Result of anchoring the window + resolving the capture scope against the source. */
export interface ProbeResult {
  timeRange: TimeRange;
  /**
   * The broad snapshot query (an entity `terms`, else the symptom's datasets), with a
   * `must_not` on any dominant symptom-free datasets dropped before window sizing.
   */
  snapshotQuery: QueryDsl;
  /** Symptom hits that fall inside the window (informational). */
  expectedSymptomDocCount: number;
  /** Reindex total: all docs in the broadened scope within `timeRange`. */
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

function bucketList(
  aggregations: Record<string, unknown> | undefined,
  name: string
): Array<{ key: string; count: number }> {
  const buckets =
    (aggregations?.[name] as { buckets?: Array<{ key: string | number; doc_count: number }> })
      ?.buckets ?? [];
  return buckets.map((bucket) => ({ key: String(bucket.key), count: bucket.doc_count }));
}

/** One populated symptom-timeline bucket with its precise first/last hit timestamps. */
interface TimelineBucket {
  count: number;
  firstMs: number;
  lastMs: number;
}

/** Extracts the populated symptom-timeline buckets (with per-bucket min/max @timestamp). */
function timelineBuckets(aggregations: Record<string, unknown> | undefined): TimelineBucket[] {
  const raw =
    (
      aggregations?.timeline as {
        buckets?: Array<{
          key: number;
          doc_count: number;
          first?: { value?: number | null };
          last?: { value?: number | null };
        }>;
      }
    )?.buckets ?? [];
  return raw.map((bucket) => ({
    count: bucket.doc_count,
    firstMs: bucket.first?.value ?? bucket.key,
    lastMs: bucket.last?.value ?? bucket.key,
  }));
}

/** Terms aggregation (one per entity field) probed over the symptom hits. */
function entityAggs(): Record<string, AggregationsAggregationContainer> {
  const aggs: Record<string, AggregationsAggregationContainer> = {};
  ENTITY_FIELDS.forEach((field, i) => {
    aggs[`entity_${i}`] = { terms: { field, size: MAX_ENTITY_VALUES + 1 } };
  });
  return aggs;
}

/** Layers a `must_not` on the dropped datasets over the snapshot scope. */
function excludeDatasets(scope: QueryDsl, datasets: string[]): QueryDsl {
  if (datasets.length === 0) {
    return scope;
  }
  return {
    bool: {
      filter: [scope as QueryDslQueryContainer],
      must_not: [{ terms: { 'data_stream.dataset': datasets } }],
    },
  };
}

/**
 * Gap-splits symptom-hit timeline buckets into clusters and returns the densest one
 * (most hits) as the seed position for the adaptive window.
 */
function findDensestCluster(
  timeline: TimelineBucket[],
  firstMs: number,
  lastMs: number
): { minMs: number; maxMs: number } {
  if (timeline.length === 0) {
    return { minMs: firstMs, maxMs: lastMs };
  }
  const clusters: Array<{ min: number; max: number; count: number }> = [];
  for (const bucket of timeline) {
    const current = clusters[clusters.length - 1];
    if (!current || bucket.firstMs - current.max > SYMPTOM_CLUSTER_GAP_MS) {
      clusters.push({ min: bucket.firstMs, max: bucket.lastMs, count: bucket.count });
    } else {
      current.max = Math.max(current.max, bucket.lastMs);
      current.count += bucket.count;
    }
  }
  const densest = clusters.reduce((best, c) => (c.count > best.count ? c : best));
  return { minMs: densest.min, maxMs: densest.max };
}

/**
 * Always-on dominance-gated noise removal. Returns the symptom-free datasets whose
 * individual count meets or exceeds `NOISE_DROP_DOMINANCE_PCT`% of the total scope,
 * sorted largest-first. Symptom datasets are never returned.
 */
function selectDominantNoiseDatasets({
  datasets,
  symptomDatasets,
  total,
}: {
  datasets: Array<{ dataset: string; count: number }>;
  symptomDatasets: string[];
  total: number;
}): string[] {
  if (total === 0) return [];
  const dominanceFloor = (NOISE_DROP_DOMINANCE_PCT / 100) * total;
  const protectedDatasets = new Set(symptomDatasets);
  return datasets
    .filter((entry) => !protectedDatasets.has(entry.dataset) && entry.count >= dominanceFloor)
    .sort((a, b) => b.count - a.count || a.dataset.localeCompare(b.dataset))
    .map((entry) => entry.dataset);
}

/** Per-entity-value bucket with its symptom hit count (sorted descending by the ES terms agg). */
interface EntityValue {
  value: string;
  symptomHits: number;
}

/** Full result of `buildSnapshotScope`, including entity metadata for top-N narrowing. */
interface SnapshotScopeResult {
  scope: QueryDsl;
  /** The entity field used for scoping, or `null` when falling back to datasets. */
  entityField: string | null;
  /** Entity values sorted by symptom hit count descending (empty when dataset fallback). */
  entityValues: EntityValue[];
}

/**
 * Builds the broad snapshot scope from what the symptom hits reveal. In priority
 * order it scopes by the FIRST entity field (see `ENTITY_FIELDS`) with non-empty,
 * bounded cardinality. When no entity resolves, it falls back to the datasets the
 * symptom lands in. Returns `undefined` only when neither resolves.
 */
function buildSnapshotScope(
  aggregations: Record<string, unknown> | undefined,
  datasets: string[],
  log: ToolingLog
): SnapshotScopeResult | undefined {
  for (let i = 0; i < ENTITY_FIELDS.length; i++) {
    const field = ENTITY_FIELDS[i];
    const buckets = bucketList(aggregations, `entity_${i}`);
    if (buckets.length > 0 && buckets.length <= MAX_ENTITY_VALUES) {
      const entityValues: EntityValue[] = buckets.map((b) => ({
        value: b.key,
        symptomHits: b.count,
      }));
      const values = entityValues.map((v) => v.value);
      log.info(
        `Scoping snapshot by entity "${field}" = ${values.length} value(s) from the symptom hits.`
      );
      return { scope: { terms: { [field]: values } }, entityField: field, entityValues };
    }
  }
  if (datasets.length > 0) {
    log.info(
      `No bounded entity on the symptom hits; scoping snapshot by ${datasets.length} ` +
        `dataset(s) the symptom lands in.`
    );
    return {
      scope: { terms: { 'data_stream.dataset': datasets } },
      entityField: null,
      entityValues: [],
    };
  }
  return undefined;
}

/** Scoped total + per-dataset breakdown within the query window. */
async function datasetSlice(esClient: Client, index: string, query: QueryDsl) {
  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    size: 0,
    track_total_hits: true,
    query: query as QueryDslQueryContainer,
    aggs: { datasets: { terms: { field: 'data_stream.dataset', size: 200 } } },
  });
  const total = response.hits.total;
  return {
    total: typeof total === 'number' ? total : total?.value ?? 0,
    datasets: bucketList(
      response.aggregations as Record<string, unknown> | undefined,
      'datasets'
    ).map((entry) => ({ dataset: entry.key, count: entry.count })),
  };
}

/**
 * Budget-driven adaptive window. Runs a date_histogram over the denoised scope within
 * `searchWindow`, seeds the selection from the densest symptom cluster, then greedily
 * expands left/right while the running total stays within `budget`. Returns the final
 * window and a `budgetExceeded` flag (true iff even the seed cluster alone exceeds budget).
 */
async function adaptiveWindow({
  esClient,
  index,
  query,
  searchWindow,
  cluster,
  budget,
  log,
}: {
  esClient: Client;
  index: string;
  query: QueryDsl;
  searchWindow: TimeRange;
  cluster: { minMs: number; maxMs: number };
  budget: number;
  log: ToolingLog;
}): Promise<{ timeRange: TimeRange; budgetExceeded: boolean }> {
  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    size: 0,
    track_total_hits: false,
    query: withTimeRange(searchWindow, query),
    aggs: {
      timeline: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: WINDOW_HISTOGRAM_INTERVAL,
          min_doc_count: 0,
          extended_bounds: { min: searchWindow.gte, max: searchWindow.lt },
        },
      },
    },
  });

  const buckets =
    (
      response.aggregations?.timeline as {
        buckets?: Array<{ key: number; doc_count: number }>;
      }
    )?.buckets ?? [];

  if (buckets.length === 0) {
    return {
      timeRange: {
        gte: toIso(cluster.minMs),
        lt: toIso(cluster.maxMs + WINDOW_HISTOGRAM_INTERVAL_MS),
      },
      budgetExceeded: false,
    };
  }

  // Seed: all histogram buckets whose [start, end) interval overlaps the symptom cluster.
  let left = -1;
  let right = -1;
  for (let i = 0; i < buckets.length; i++) {
    const bStart = buckets[i].key;
    const bEnd = bStart + WINDOW_HISTOGRAM_INTERVAL_MS;
    if (bStart <= cluster.maxMs && bEnd > cluster.minMs) {
      if (left === -1) left = i;
      right = i;
    }
  }

  if (left === -1) {
    const histTotal = buckets.reduce((sum, b) => sum + b.doc_count, 0);
    log.warning(
      `Symptom cluster falls outside histogram range — falling back to full search window.`
    );
    return { timeRange: searchWindow, budgetExceeded: histTotal > budget };
  }

  let total = buckets.slice(left, right + 1).reduce((sum, b) => sum + b.doc_count, 0);

  if (total > budget) {
    log.warning(
      `Densest symptom cluster seed has ~${total} docs, exceeding the ${budget} doc budget.`
    );
    return {
      timeRange: {
        gte: toIso(buckets[left].key),
        lt: toIso(buckets[right].key + WINDOW_HISTOGRAM_INTERVAL_MS),
      },
      budgetExceeded: true,
    };
  }

  // Greedy expand: exhaust left side first, then right.
  while (left > 0 && total + buckets[left - 1].doc_count <= budget) {
    left--;
    total += buckets[left].doc_count;
  }
  while (right < buckets.length - 1 && total + buckets[right + 1].doc_count <= budget) {
    right++;
    total += buckets[right].doc_count;
  }

  return {
    timeRange: {
      gte: toIso(buckets[left].key),
      lt: toIso(buckets[right].key + WINDOW_HISTOGRAM_INTERVAL_MS),
    },
    budgetExceeded: false,
  };
}

/**
 * Resolves the capture against the Overview SOURCE cluster (the cluster the reindex
 * actually pulls from), because the investigating Agent Builder runs on a DIFFERENT
 * cluster where environment-specific values do not match. It:
 *
 *  1. Searches the evidence-only symptom over the wide `searchWindow` for its first/last
 *     `@timestamp`, the datasets it lands in, and the entity values it touched.
 *  2. STOPS (throws) if the symptom matches 0 docs — the derivation is wrong for this
 *     source and any capture would be empty.
 *  3. Gap-splits the symptom timeline to find the densest cluster, which seeds the
 *     adaptive window so it grows from the main event burst outward.
 *  4. Builds the broad snapshot scope deterministically from the hits — the
 *     concentrated entity (first in `ENTITY_FIELDS` with bounded cardinality), else the
 *     datasets the symptom lands in.
 *  5. Counts the scope over the full `searchWindow`. Any symptom-free dataset that alone
 *     exceeds `NOISE_DROP_DOMINANCE_PCT`% of the total is dropped BEFORE window sizing
 *     (always-on, dominance-gated) — bulk noise like proxy.log / elasticsearch.gc is shed
 *     so the budget is available for content-rich data and a wider time window.
 *  6. Runs `adaptiveWindow` on the denoised scope: seeds from the densest symptom cluster,
 *     then greedily expands until the next 5-minute bucket would exceed `CAPTURE_DOC_BUDGET`
 *     (the "just enough" target — keeps the capture a tight dense slice, not the MAX ceiling).
 *  7. When even the cluster seed is over budget and the scope is entity-keyed,
 *     progressively halves the entity value set (keeping top-N by symptom hit count) and
 *     retries `adaptiveWindow` until the budget fits or N=1 is exhausted.
 *  8. Runs final exact counts: snapshot total + symptom hit count within the chosen window.
 */
export async function probeOverview({
  esClient,
  log,
  sourceIndex,
  searchWindow,
  symptom,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string[];
  searchWindow: TimeRange;
  symptom: QueryDsl;
}): Promise<ProbeResult> {
  const index = sourceIndex.join(',');

  // 1. Locate the symptom: its @timestamp span, the datasets it lands in, and the
  //    entity values it touched (aggregated in the same pass to build the scope).
  log.info(
    `Probing Overview source "${index}" for the symptom span + affected datasets ` +
      `within ${searchWindow.gte}..${searchWindow.lt}`
  );
  const symptomProbe = await esClient.search({
    index,
    ignore_unavailable: true,
    size: 0,
    track_total_hits: true,
    query: withTimeRange(searchWindow, symptom),
    aggs: {
      first: { min: { field: '@timestamp' } },
      last: { max: { field: '@timestamp' } },
      datasets: { terms: { field: 'data_stream.dataset', size: 200 } },
      // Fine-grain symptom timeline for densest-cluster detection. Per-bucket first/last
      // give precise gap edges so large quiet gaps are correctly identified.
      timeline: {
        date_histogram: { field: '@timestamp', fixed_interval: '5m', min_doc_count: 1 },
        aggs: {
          first: { min: { field: '@timestamp' } },
          last: { max: { field: '@timestamp' } },
        },
      },
      ...entityAggs(),
    },
  });

  const totalHits = symptomProbe.hits.total;
  const symptomHits = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
  const firstMs = (symptomProbe.aggregations?.first as { value?: number | null })?.value ?? null;
  const lastMs = (symptomProbe.aggregations?.last as { value?: number | null })?.value ?? null;

  // 2. VALIDATE: no symptom docs → the derivation is wrong for this source and any
  //    capture would be empty. Fail loudly instead of writing a 0-hit config.
  if (symptomHits === 0 || firstMs === null || lastMs === null) {
    throw new Error(
      `Symptom matched 0 docs on the Overview source "${index}" within ` +
        `${searchWindow.gte}..${searchWindow.lt}. The derived symptom query does not match this ` +
        `cluster — re-run to re-derive (Step 2 is nondeterministic), or hand-edit query.symptom ` +
        `in the config, then re-run.`
    );
  }

  const aggregations = symptomProbe.aggregations as Record<string, unknown> | undefined;
  const symptomDatasets = bucketList(aggregations, 'datasets').map((entry) => entry.key);

  log.info(
    `Symptom span: ${symptomHits} hit(s) from ${toIso(firstMs)} to ${toIso(lastMs)} across ` +
      `${symptomDatasets.length} dataset(s).`
  );

  // 3. Gap-split the symptom timeline to find the densest cluster. This seeds the
  //    adaptive window so expansion starts from the main event burst.
  const cluster = findDensestCluster(timelineBuckets(aggregations), firstMs, lastMs);

  // 4. Build the broad snapshot scope from the entity values the symptom touched.
  const scopeResult = buildSnapshotScope(aggregations, symptomDatasets, log);
  if (!scopeResult) {
    throw new Error(
      `Could not build a snapshot scope: the symptom hits carry no bounded entity ` +
        `(${ENTITY_FIELDS.join(', ')}) and no data_stream.dataset. Hand-edit query.snapshot in ` +
        `the config to scope the capture, then re-run.`
    );
  }
  const { scope: snapshotScope, entityField, entityValues } = scopeResult;

  // Invariant: symptom ⊆ snapshot. The union (scope ∪ symptom) ensures symptom docs in
  // a non-data-stream index (no data_stream.dataset) are still counted and captured.
  const hasSymptom = Boolean(symptom && Object.keys(symptom).length > 0);

  // Helper: scope ∪ symptom over the full search window (used for noise counting).
  const scopeOverSearchWindow = (scope: QueryDsl): QueryDsl =>
    withTimeRange(
      searchWindow,
      hasSymptom ? { bool: { should: [scope, symptom], minimum_should_match: 1 } } : scope
    ) as QueryDsl;

  // 5. Always-on dominance-gated noise removal. Count the scope over the full search
  //    window, then drop every symptom-free dataset that alone exceeds the dominance
  //    floor. This runs BEFORE window sizing: shedding bulk noise here lets the budget
  //    stretch over a wider time window in step 6 instead of being wasted on noise.
  const initialSlice = await datasetSlice(esClient, index, scopeOverSearchWindow(snapshotScope));
  const dominantNoise = selectDominantNoiseDatasets({
    datasets: initialSlice.datasets,
    symptomDatasets,
    total: initialSlice.total,
  });

  let finalSnapshotQuery =
    dominantNoise.length > 0 ? excludeDatasets(snapshotScope, dominantNoise) : snapshotScope;
  if (dominantNoise.length > 0) {
    log.info(
      `Always-on noise drop: ${dominantNoise.length} dominant symptom-free dataset(s) ` +
        `(each ≥${NOISE_DROP_DOMINANCE_PCT}% of scope) excluded: ${dominantNoise.join(', ')}.`
    );
  }

  // 6. Adaptive window: histogram over the denoised scope within the full search window,
  //    seeded from the densest symptom cluster, then greedy left/right expansion until
  //    the next bucket would exceed CAPTURE_DOC_BUDGET (the "just enough" target volume —
  //    a tight dense slice, NOT the MAX_REINDEX_DOCS ceiling).
  const denoisedQuery: QueryDsl = hasSymptom
    ? { bool: { should: [finalSnapshotQuery, symptom], minimum_should_match: 1 } }
    : finalSnapshotQuery;

  let { timeRange, budgetExceeded } = await adaptiveWindow({
    esClient,
    index,
    query: denoisedQuery,
    searchWindow,
    cluster,
    budget: CAPTURE_DOC_BUDGET,
    log,
  });

  // 7. Top-N entity narrowing — last resort when even the cluster seed is over budget
  //    and the scope is keyed on an entity field. Progressively halve the entity set
  //    (keeping the top-N by symptom hit count descending — highest relevance first)
  //    and retry adaptiveWindow until it fits or N=1 is exhausted.
  if (budgetExceeded && entityField !== null && entityValues.length > 1) {
    let remaining = entityValues;
    while (remaining.length > 1) {
      remaining = remaining.slice(0, Math.ceil(remaining.length / 2));
      const narrowedScope: QueryDsl = { terms: { [entityField]: remaining.map((v) => v.value) } };
      const narrowedSlice = await datasetSlice(
        esClient,
        index,
        scopeOverSearchWindow(narrowedScope)
      );
      const narrowedNoise = selectDominantNoiseDatasets({
        datasets: narrowedSlice.datasets,
        symptomDatasets,
        total: narrowedSlice.total,
      });
      const narrowedFinalScope =
        narrowedNoise.length > 0 ? excludeDatasets(narrowedScope, narrowedNoise) : narrowedScope;
      const narrowedDenoisedQuery: QueryDsl = hasSymptom
        ? { bool: { should: [narrowedFinalScope, symptom], minimum_should_match: 1 } }
        : narrowedFinalScope;
      const narrowResult = await adaptiveWindow({
        esClient,
        index,
        query: narrowedDenoisedQuery,
        searchWindow,
        cluster,
        budget: CAPTURE_DOC_BUDGET,
        log,
      });
      if (!narrowResult.budgetExceeded) {
        log.info(
          `Top-N entity: narrowed to ${remaining.length}/${entityValues.length} ` +
            `"${entityField}" value(s) — budget fits.`
        );
        finalSnapshotQuery = narrowedFinalScope;
        timeRange = narrowResult.timeRange;
        budgetExceeded = false;
        break;
      }
    }
    if (budgetExceeded) {
      log.warning(
        `Top-N entity exhausted: even 1 "${entityField}" value exceeds ${CAPTURE_DOC_BUDGET} docs ` +
          `in the densest window. Narrow query.snapshot manually or use a finer entity field.`
      );
    }
  }

  // 8. Final exact counts: full snapshot scope + symptom hit count within the chosen window.
  const reindexScope = (scope: QueryDsl): QueryDsl =>
    withTimeRange(
      timeRange,
      hasSymptom ? { bool: { should: [scope, symptom], minimum_should_match: 1 } } : scope
    ) as QueryDsl;

  const [snapshotSlice, symptomCountResult] = await Promise.all([
    datasetSlice(esClient, index, reindexScope(finalSnapshotQuery)),
    esClient.count({
      index,
      ignore_unavailable: true,
      query: withTimeRange(timeRange, symptom),
    }),
  ]);

  const expectedSymptomDocCount = symptomCountResult.count;
  const expectedDocCount = snapshotSlice.total;

  log.info(
    `Overview probe: reindex scope (snapshot ∪ symptom) = ${expectedDocCount} docs; ` +
      `${expectedSymptomDocCount} symptom hit(s) within ${timeRange.gte}..${timeRange.lt} across ` +
      `${snapshotSlice.datasets.length} dataset(s): ${
        snapshotSlice.datasets.map((e) => `${e.dataset}(${e.count})`).join(', ') || 'none'
      }`
  );

  if (expectedDocCount > MAX_REINDEX_DOCS) {
    log.warning(
      `Estimated ${expectedDocCount} docs still exceeds the ${MAX_REINDEX_DOCS} reindex safety ` +
        `limit${entityField ? ` — top-N entity narrowing was exhausted` : ''}. ` +
        `Narrow query.snapshot manually or shorten the search window.`
    );
  }

  return {
    timeRange,
    snapshotQuery: finalSnapshotQuery,
    expectedSymptomDocCount,
    expectedDocCount,
  };
}
