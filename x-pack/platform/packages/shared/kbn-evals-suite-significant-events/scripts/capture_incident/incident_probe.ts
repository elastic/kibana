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
// A candidate entity scope must contain at least this fraction of the symptom hits
// to be eligible; among eligible candidates the NARROWEST (fewest docs) wins, so a
// shared-infra incident scopes by pod rather than the whole node.
const MIN_SYMPTOM_COVERAGE = 0.5;
// Entity candidates discovered from the symptom hits, in addition to the agent's.
const POD_ENTITY_FIELD = 'kubernetes.pod.name';
const HOST_ENTITY_FIELD = 'host.name';
// "Natural scope keys" — stable, cross-dataset identifiers that key a whole
// tenant/workload. Preferred over the narrowest pod/host scope WHEN their capture
// stays bounded (see SCOPE_KEY_MAX_DOCS), because they span every dataset the scope
// emitted (e.g. a serverless project's kibana.log + elasticsearch.server), matching
// the hand-curated baselines' project-scoped captures instead of a pod subset.
const SCOPE_KEY_FIELDS = ['serverless.project.id', 'kubernetes.namespace'] as const;
// Prefer a natural scope key only while its non-noise capture is at/below this many
// docs; above it, fall back to the narrowest-covering pod/host scope to stay bounded.
// Kept conservative because the remote reindex reads from a FROZEN tier over a
// long-lived connection that grows unreliable (scroll expiry, connection resets) as
// the capture size/duration grows — so favour smaller, reliably-reindexable scopes.
const SCOPE_KEY_MAX_DOCS = 50_000;

// Datasets that are high-volume and low-signal for reproducing an incident (GC
// logs, HTTP access/proxy noise, bootstrap logs). When they are NOT where the
// symptom lives, they are excluded from the reindex so the snapshot keeps the
// meaningful noise without ballooning in size. Mirrors the hand-written
// `source.exclude` in the customer0-incidents baselines. Matched as substrings of
// `data_stream.dataset`.
const NOISY_DATASET_SUBSTRINGS = ['elasticsearch.gc', 'proxy.log', 'bootstrap_logs'];
// Generic backstop: a non-symptom dataset that is both huge in absolute terms and
// dominates the slice is excluded too, even if it is not in the known list.
const DOMINANT_DATASET_MIN_DOCS = 1_000_000;
const DOMINANT_DATASET_SHARE = 0.4;

/** Time window as ISO-8601 strings. */
export interface TimeRange {
  gte: string;
  lt: string;
}

/** Result of anchoring the window + resolving the entity against the Overview source. */
export interface ProbeResult {
  timeRange: TimeRange;
  /** The entity field actually used (may differ from the requested one on fallback). */
  entityField: string;
  /** The broad snapshot query (a `terms` on the entity field over the discovered values). */
  snapshotQuery: QueryDsl;
  /** The concrete entity values discovered on the source from the symptom hits. */
  entityValues: string[];
  /** Datasets the entity emitted that ARE reindexed (breakdown minus excludes). */
  includedDatasets: string[];
  /** `data_stream.dataset` names dropped from the reindex (oversized / low-signal). */
  excludedDatasets: string[];
  /** Symptom hits that fall inside the entity scope within the window (informational). */
  expectedSymptomDocCount: number;
  /** Reindex total: entity-scoped docs within `timeRange`, AFTER excludes. */
  expectedDocCount: number;
  /** Per-dataset breakdown of the entity-scoped hits (proves the entity spans datasets). */
  datasets: Array<{ dataset: string; count: number }>;
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

async function countDocs(esClient: Client, index: string, query: QueryDslQueryContainer) {
  const response = await esClient.count(
    { index, ignore_unavailable: true, query },
    { requestTimeout: PROBE_REQUEST_TIMEOUT_MS }
  );
  return response.count ?? 0;
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
 *     first/last `@timestamp` and the distinct values of `entityField` (and
 *     host.name) that emitted the symptom.
 *  2. Anchors `timeRange = [first - 1h, last + 1h]`.
 *  3. Scopes the broad snapshot by the discovered entity values. If that scope
 *     misses most symptom hits (the field does not key the symptom dataset), it
 *     falls back to the node host.name that emitted the symptom.
 *  4. Drops oversized / low-signal datasets that do NOT carry the symptom.
 */
export async function probeOverview({
  esClient,
  log,
  sourceIndex,
  searchWindow,
  symptom,
  entityField: requestedField,
}: {
  esClient: Client;
  log: ToolingLog;
  sourceIndex: string[];
  searchWindow: TimeRange;
  symptom: QueryDsl;
  entityField: string;
}): Promise<ProbeResult> {
  const index = sourceIndex.join(',');

  // 1. Locate the symptom span + the affected entity values (requested field + host).
  log.info(
    `Probing Overview source "${index}" for the symptom span + affected ${requestedField} ` +
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
        entities: { terms: { field: requestedField, size: MAX_ENTITY_VALUES } },
        pods: { terms: { field: POD_ENTITY_FIELD, size: MAX_ENTITY_VALUES } },
        hosts: { terms: { field: HOST_ENTITY_FIELD, size: MAX_ENTITY_VALUES } },
        projects: { terms: { field: SCOPE_KEY_FIELDS[0], size: MAX_ENTITY_VALUES } },
        namespaces: { terms: { field: SCOPE_KEY_FIELDS[1], size: MAX_ENTITY_VALUES } },
      },
    },
    { requestTimeout: PROBE_REQUEST_TIMEOUT_MS }
  );

  const totalHits = symptomProbe.hits.total;
  const symptomHitsInWindow = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
  const firstMs = (symptomProbe.aggregations?.first as { value?: number | null })?.value ?? null;
  const lastMs = (symptomProbe.aggregations?.last as { value?: number | null })?.value ?? null;
  const aggs = symptomProbe.aggregations as Record<string, unknown> | undefined;
  const requestedValues = bucketList(aggs, 'entities').map((entry) => entry.key);
  const podValues = bucketList(aggs, 'pods').map((entry) => entry.key);
  const hostValues = bucketList(aggs, 'hosts').map((entry) => entry.key);
  const projectValues = bucketList(aggs, 'projects').map((entry) => entry.key);
  const namespaceValues = bucketList(aggs, 'namespaces').map((entry) => entry.key);

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

  const symptomInWindow = await countDocs(esClient, index, withTimeRange(timeRange, symptom));

  // 3. Resolve the entity scope. Evaluate the agent's field plus the pod and the
  //    node, then pick the NARROWEST scope that still contains the symptom, so a
  //    shared-infra incident scopes by pod (bounded) rather than the whole node
  //    (all tenants, tens of millions of docs). Values come from the symptom hits.
  const resolve = async (field: string, values: string[]) => {
    const query: QueryDsl = { terms: { [field]: values } };
    const slice = await entitySlice(esClient, index, withTimeRange(timeRange, query));
    const symptomInEntity = await countDocs(
      esClient,
      index,
      withTimeRange(timeRange, symptom, query)
    );
    const coverage = symptomInWindow > 0 ? symptomInEntity / symptomInWindow : 1;
    return { field, values, query, slice, symptomInEntity, coverage };
  };

  const candidateSpecs = [
    { field: requestedField, values: requestedValues },
    { field: SCOPE_KEY_FIELDS[0], values: projectValues },
    { field: SCOPE_KEY_FIELDS[1], values: namespaceValues },
    { field: POD_ENTITY_FIELD, values: podValues },
    { field: HOST_ENTITY_FIELD, values: hostValues },
  ]
    // De-dupe by field (the agent may already have picked pod/host) and drop empties.
    .filter((spec, i, all) => all.findIndex((other) => other.field === spec.field) === i)
    .filter((spec) => spec.values.length > 0);

  const candidates: Array<Awaited<ReturnType<typeof resolve>>> = [];
  for (const spec of candidateSpecs) {
    const resolved = await resolve(spec.field, spec.values);
    candidates.push(resolved);
    log.info(
      `  entity candidate ${spec.field}: ${spec.values.length} value(s), ` +
        `${resolved.slice.total} docs, coverage ${(resolved.coverage * 100).toFixed(0)}%`
    );
  }

  // Non-noise size of a candidate's slice — the size that actually gets reindexed
  // once GC/proxy/bootstrap noise is excluded. Used to bound a "natural scope key".
  const nonNoiseTotal = (candidate: Awaited<ReturnType<typeof resolve>>): number =>
    candidate.slice.datasets
      .filter((entry) => !isNoisyDataset(entry.dataset))
      .reduce((sum, entry) => sum + entry.count, 0);

  // Choose the entity scope among the candidates that contain the symptom (coverage
  // >= MIN). Prefer a NATURAL SCOPE KEY (serverless.project.id > kubernetes.namespace)
  // when its non-noise capture is bounded — it spans every dataset the scope emitted
  // (e.g. kibana.log + elasticsearch.server), matching the baseline's project scope.
  // Otherwise fall back to the NARROWEST-covering scope (pod over node) to stay
  // bounded. With no covered candidate, take the best coverage (tie: narrowest).
  let entity;
  if (candidates.length === 0) {
    entity = await resolve(requestedField, requestedValues);
  } else {
    const covered = candidates.filter((candidate) => candidate.coverage >= MIN_SYMPTOM_COVERAGE);
    if (covered.length > 0) {
      const scopeKeyPick = covered
        .filter(
          (candidate) =>
            (SCOPE_KEY_FIELDS as readonly string[]).includes(candidate.field) &&
            nonNoiseTotal(candidate) <= SCOPE_KEY_MAX_DOCS
        )
        .sort(
          (a, b) =>
            (SCOPE_KEY_FIELDS as readonly string[]).indexOf(a.field) -
            (SCOPE_KEY_FIELDS as readonly string[]).indexOf(b.field)
        )[0];
      if (scopeKeyPick) {
        entity = scopeKeyPick;
        log.info(
          `Preferring natural scope key "${entity.field}" (non-noise ${nonNoiseTotal(
            entity
          )} docs <= ${SCOPE_KEY_MAX_DOCS}) over the narrowest pod/host scope.`
        );
      } else {
        entity = [...covered].sort((a, b) => a.slice.total - b.slice.total)[0];
      }
    } else {
      entity = [...candidates].sort(
        (a, b) => b.coverage - a.coverage || a.slice.total - b.slice.total
      )[0];
    }
  }

  log.info(
    `Selected entity "${entity.field}" (${entity.values.length} value(s), ${entity.slice.total} ` +
      `docs, coverage ${(entity.coverage * 100).toFixed(0)}%).`
  );

  if (entity.values.length === 0) {
    log.warning(
      `No "${entity.field}" values found on the symptom hits — the snapshot query will match ` +
        `nothing. Review the symptom / entity field in the derived config.`
    );
  }

  // 4. The reindex captures the entity scope UNION the symptom, so EVERY symptom
  //    doc lands in the snapshot even when it sits on an entity outside the scope
  //    (invariant: symptom ⊆ snapshot). Break that union down per dataset, then drop
  //    oversized / low-signal datasets — but NEVER one that carries symptom docs.
  const hasSymptom = Boolean(symptom && Object.keys(symptom).length > 0);
  const reindexScope: QueryDsl = hasSymptom
    ? { bool: { should: [entity.query, symptom], minimum_should_match: 1 } }
    : entity.query;
  const snapshotSlice = await entitySlice(esClient, index, withTimeRange(timeRange, reindexScope));

  // Datasets that hold ANY symptom doc in the window — protected from exclusion so
  // the symptom is never dropped from the capture.
  const symptomByDataset = await entitySlice(esClient, index, withTimeRange(timeRange, symptom));
  const symptomDatasets = new Set(
    symptomByDataset.datasets.filter((entry) => entry.count > 0).map((entry) => entry.dataset)
  );

  const { datasets } = snapshotSlice;
  const excludedDatasets = datasets
    .filter((entry) => !symptomDatasets.has(entry.dataset))
    .filter(
      (entry) =>
        isNoisyDataset(entry.dataset) ||
        (entry.count >= DOMINANT_DATASET_MIN_DOCS &&
          snapshotSlice.total > 0 &&
          entry.count / snapshotSlice.total >= DOMINANT_DATASET_SHARE)
    )
    .map((entry) => entry.dataset);

  const excludedSet = new Set(excludedDatasets);
  const includedEntries = datasets.filter((entry) => !excludedSet.has(entry.dataset));
  const includedDatasets = includedEntries.map((entry) => entry.dataset);
  const expectedDocCount = includedEntries.reduce((sum, entry) => sum + entry.count, 0);
  // All symptom-carrying datasets are protected/included, so every in-window symptom
  // doc is captured.
  const expectedSymptomDocCount = symptomInWindow;

  if (snapshotSlice.total > 0) {
    log.info(
      `Overview probe: reindex scope (entity ${entity.field}=${entity.values.length} value(s) ∪ ` +
        `symptom) = ${snapshotSlice.total} docs across ${datasets.length} dataset(s); ` +
        `${expectedDocCount} after excludes; ${expectedSymptomDocCount} symptom hit(s) captured. ` +
        `Datasets: ${datasets.map((e) => `${e.dataset}(${e.count})`).join(', ') || 'none'}`
    );
    if (excludedDatasets.length > 0) {
      log.info(`Excluding oversized / low-signal datasets: ${excludedDatasets.join(', ')}`);
    }
  }

  return {
    timeRange,
    entityField: entity.field,
    snapshotQuery: entity.query,
    entityValues: entity.values,
    includedDatasets,
    excludedDatasets,
    expectedSymptomDocCount,
    expectedDocCount,
    datasets,
  };
}
