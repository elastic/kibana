/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty, ReindexRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  buildSnapshotQuery,
  buildSymptomQuery,
  readIncidentConfig,
  resolveIncidentConfig,
  type ResolvedIncidentConfig,
} from './incident_config';
import { createOverviewClient } from './incident_probe';
import {
  createIncidentSnapshot,
  generateIncidentSnapshotName,
  registerIncidentGcsRepository,
  uploadManifest,
} from './incident_gcs';
import { MAX_REINDEX_DOCS, NIGHTSHIFT_INCIDENT_BUCKET } from './constants';
import { splitClusterAlias, toIso } from './incident_utils';

// Large, multi-dataset slices from a frozen (`partial-`) tier over CCS reindex
// slowly, so submit the reindex asynchronously (wait_for_completion=false) and
// poll the task rather than holding one long HTTP connection that would hit the
// client socket timeout.
const REINDEX_SUBMIT_REQUEST_TIMEOUT_MS = 60 * 1000;
const REINDEX_POLL_INTERVAL_MS = 15 * 1000;
/** Per-CHUNK wait budget. Chunks are small, so this need not be the whole-run budget. */
const REINDEX_CHUNK_MAX_WAIT_MS = 2 * 60 * 60 * 1000;

/**
 * Target docs per reindex chunk. Remote reindex CANNOT resume a scroll mid-flight, so a
 * chunk that truncates is retried from scratch — meaning the chunk must be small enough
 * that its single scroll completes before the slow, CCS-federated frozen tier drops the
 * scroll context (which it does after a bounded number of docs / wall-time). Too large and
 * every retry re-hits the same wall at the same point; small chunks each finish, and the
 * progress sidecar persists them. Lower this if you still see "scroll ended early"
 * truncations. Tune per environment.
 */
const TARGET_CHUNK_DOCS = 25_000;
/** Histogram granularity used to plan count-balanced chunks. */
const CHUNK_HISTOGRAM_INTERVAL = '5m';
const CHUNK_HISTOGRAM_INTERVAL_MS = 5 * 60 * 1000;
/** Fallback chunk width when the planning histogram can't be read (source momentarily down). */
const CHUNK_FALLBACK_MS = 60 * 60 * 1000;
/** Attempts per chunk before failing the run. Retries are idempotent (source `_id` preserved). */
const REINDEX_CHUNK_MAX_ATTEMPTS = 3;
const REINDEX_CHUNK_RETRY_DELAY_MS = 5 * 1000;
/**
 * Scroll batch size for the remote reindex. Larger = fewer round trips to the slow source,
 * but a bigger per-request load that a flaky frozen tier is likelier to drop. Lower it
 * alongside the chunk size if scrolls keep ending early. Tune per environment.
 */
const REINDEX_BATCH_DOCS = 2000;

/**
 * Allowed shortfall vs `expectedDocCount`. The probe counts the source at derivation
 * time; the reindex runs later against live `logs-*` (docs arrive, frozen shards shift,
 * CCS totals are approximate), so a strict equality check is too brittle.
 */
const DOC_COUNT_TOLERANCE = 0.02;

/**
 * Cap on the assembled `source.index` expression length. Remote reindex sends the index
 * list in the source cluster's `_pit`/search URI, which ES limits to a 4096-byte HTTP
 * line; keeping the pre-encoding expression well under that leaves headroom for URL
 * escaping (`:` → `%3A`) + query params. Above it, we keep the broad `logs-*` pattern.
 */
const SOURCE_INDEX_MAX_CHARS = 2500;

/** Extracts the `host:port` form used by `reindex.remote.whitelist` from a URL. */
function toHostPort(hostUrl: string): string {
  const url = new URL(hostUrl);
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return `${url.hostname}:${port}`;
}

/** Matches a `host:port` string against a whitelist pattern that may contain `*`. */
function matchesWhitelistPattern(hostPort: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(hostPort);
}

async function readRemoteWhitelist(esClient: Client): Promise<string[]> {
  // `reindex.remote.whitelist` is a static node-level setting (not a cluster
  // setting), so it must come from node info. `flat_settings` returns it under the
  // dotted key, avoiding fragile nested traversal.
  const response = await esClient.nodes.info({ metric: 'settings', flat_settings: true });
  const whitelist = new Set<string>();

  for (const node of Object.values(response.nodes ?? {})) {
    const settings = (node as { settings?: unknown }).settings as
      | Record<string, unknown>
      | undefined;
    const raw = settings?.['reindex.remote.whitelist'];
    if (!raw) {
      continue;
    }
    const entries = Array.isArray(raw) ? raw : String(raw).split(',');
    for (const entry of entries) {
      const trimmed = String(entry).trim();
      if (trimmed) {
        whitelist.add(trimmed);
      }
    }
  }

  return [...whitelist];
}

async function assertRemoteWhitelisted({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<void> {
  const hostPort = toHostPort(config.source.host);
  const whitelist = await readRemoteWhitelist(esClient);
  const allowed = whitelist.some((pattern) => matchesWhitelistPattern(hostPort, pattern));

  if (allowed) {
    log.info(`Source host "${hostPort}" is whitelisted for remote reindex.`);
    return;
  }

  throw new Error(
    `Source host "${hostPort}" is not in reindex.remote.whitelist ` +
      `(current: ${whitelist.length ? whitelist.join(', ') : '<empty>'}).\n` +
      `reindex.remote.whitelist is a static setting — restart local ES with it configured:\n` +
      `  node scripts/es snapshot --license trial --use-cached \\\n` +
      `    -E reindex.remote.whitelist=${hostPort} \\\n` +
      `    --secure-files gcs.client.default.credentials_file=<absolute-path-to-gcs-credentials.json>`
  );
}

/**
 * Builds the painless reindex script. It always routes each doc to its ORIGINAL
 * name so the captured indices keep source identity (no `<prefix>` rename):
 * a data-stream backing index (`.ds-<name>-YYYY.MM.DD-NNNNNN`, possibly `partial-`
 * prefixed on the frozen tier) becomes its data-stream name (`<name>`); any other
 * index keeps its own name. Regex-free string ops are used because painless regex
 * is disabled by default.
 *
 * When `preserveProvenance` is on, the source backing index + cluster alias are
 * stashed into `_source` FIRST — before routing reassigns `ctx._index` — so the
 * exact source backing-index name survives.
 */
interface ReindexScript {
  lang: 'painless';
  source: string;
  params: Record<string, unknown>;
}

function buildReindexScript(config: ResolvedIncidentConfig): ReindexScript {
  const lines: string[] = [];

  if (config.preserveProvenance) {
    lines.push("ctx._source['kibana_incident_source_index'] = ctx._index;");
    lines.push(
      "if (params.cluster != null) { ctx._source['kibana_incident_source_cluster'] = params.cluster; }"
    );
  }

  // Route to the original name. On a remote reindex `ctx._index` is the source
  // backing index WITH the CCS cluster prefix, e.g.
  // `logging-ap-southeast-2:partial-.ds-logs-system.syslog-default-2026.05.28-000001`.
  // Strip the `<cluster>:` prefix, then the frozen `partial-` prefix, then reduce a
  // data-stream backing index `.ds-<name>-YYYY.MM.DD-NNNNNN` to its stream `<name>`
  // (the last two `-` segments are the date and generation, so cut before the date).
  // Anything else keeps its own (prefix-stripped) name.
  lines.push('def idx = ctx._index;');
  lines.push("int colon = idx.indexOf(':');");
  lines.push('if (colon >= 0) { idx = idx.substring(colon + 1); }');
  lines.push("if (idx.startsWith('partial-')) { idx = idx.substring(8); }");
  lines.push("if (idx.startsWith('.ds-')) {");
  lines.push("  int gen = idx.lastIndexOf('-');");
  lines.push("  int date = idx.lastIndexOf('-', gen - 1);");
  lines.push('  if (date > 4) { idx = idx.substring(4, date); }');
  lines.push('}');
  lines.push('ctx._index = idx;');

  return {
    lang: 'painless',
    source: lines.join(' '),
    params: { cluster: config.source.cluster ?? null },
  };
}

/**
 * Derives the LOCAL capture index patterns from the (remote) source patterns by
 * stripping any `clusterAlias:` prefix and dropping `-` exclusions, then adds the
 * incident's own `incident-<id>-*` bucket. These match the local indices the
 * reindex creates (docs route to their original data-stream names).
 */
function localCapturePatterns(config: ResolvedIncidentConfig): string[] {
  const fromSource = config.sourceIndex
    .map((pattern) => splitClusterAlias(pattern)[1])
    // Drop exclusions (bare `-logs-…` or the CCS `<cluster>:-logs-…`, whose bare part
    // starts with `-`) AFTER stripping the prefix — a `-`-prefixed pattern is not a valid
    // local index pattern and must never reach the index template / index listing.
    .filter((pattern) => !pattern.startsWith('-'));
  return [...new Set([...fromSource, `incident-${config.incident.id}-*`])];
}

/**
 * The core ECS fields symptom replay / triage rely on (dotted-key form). Every
 * other field stays in `_source` under `dynamic: false` (see the template below),
 * so an inconsistently-shaped field never breaks the reindex.
 */
const CORE_CAPTURE_MAPPINGS: Record<string, MappingProperty> = {
  '@timestamp': { type: 'date' },
  message: { type: 'match_only_text' },
  'host.name': { type: 'keyword' },
  'log.level': { type: 'keyword' },
  'log.logger': { type: 'keyword' },
  'data_stream.type': { type: 'keyword' },
  'data_stream.dataset': { type: 'keyword' },
  'data_stream.namespace': { type: 'keyword' },
  'service.name': { type: 'keyword' },
  'event.dataset': { type: 'keyword' },
  'error.message': { type: 'match_only_text' },
  'serverless.project.id': { type: 'keyword' },
  'kubernetes.pod.name': { type: 'keyword' },
  'kubernetes.namespace': { type: 'keyword' },
  kibana_incident_source_index: { type: 'keyword' },
  kibana_incident_source_cluster: { type: 'keyword' },
};

/**
 * Ensures a high-priority index template for the capture indices. It does two jobs
 * that the reindex + restore depend on:
 *
 *  1. `dynamic: false` + the fixed core ECS mappings — raw production logs carry
 *     fields with inconsistent shapes (e.g. `volume` as an object in some docs, a
 *     scalar in others). A dynamically mapped index rejects the minority shape with
 *     a mapper_parsing error, failing the reindex. `dynamic: false` keeps every
 *     field intact in `_source` without building conflicting mappings, while the
 *     core ECS fields stay searchable/aggregatable for symptom replay + triage.
 *  2. Plain indices (no `data_stream`) at priority 500 — the stack ships a
 *     `logs-*-*` data-stream template, so without this the reindex cannot create a
 *     plain `logs-<dataset>-default` index and every doc falls back to the
 *     `unrouted` bucket. A higher-priority non-data-stream template wins for the
 *     capture patterns and lets the original-name indices be created directly.
 */
async function ensureCaptureIndexTemplate({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<void> {
  const templateName = `incident-capture-${config.incident.id}`;
  const patterns = localCapturePatterns(config);
  const properties = CORE_CAPTURE_MAPPINGS;

  // Remove any leftover capture templates (this incident's, or another incident's
  // left behind by an interrupted run). Two different-named templates at the same
  // priority with overlapping patterns make ES reject the put, so clear them first.
  await esClient.indices.deleteIndexTemplate({ name: 'incident-capture-*' }, { ignore: [404] });

  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: patterns,
    // Beat the built-in `logs-*-*` data-stream template (priority 100) so the
    // captured original-name indices are created as plain indices with our mapping.
    priority: 500,
    template: {
      // Many datasets → many fields; lift the default 1000-field cap.
      settings: { 'index.mapping.total_fields.limit': 50000 },
      mappings: {
        // Ignore (but keep in _source) any field not explicitly mapped below.
        dynamic: false,
        properties,
      },
    },
  });

  log.info(
    `Ensured capture index template "${templateName}" (plain, dynamic:false + ` +
      `${Object.keys(properties).length} core ECS fields) for ${patterns.join(', ')}`
  );
}

/**
 * Deletes any local indices left over from a previous capture that match this
 * incident's patterns. Captures route docs to their ORIGINAL data-stream names
 * (e.g. `logs-elasticsearch.server-default`), so different incidents collide on the
 * same local index. Without this, a fresh re-run would append new docs into the
 * leftover index, mixing incidents. (Skipped on a resumed run, where the partial
 * output IS what we continue.) Deleting by resolved concrete names (not a raw
 * wildcard) avoids `action.destructive_requires_name`.
 */
async function deleteExistingCaptureIndices({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<void> {
  const patterns = localCapturePatterns(config);
  const rows = await esClient.cat.indices(
    { index: patterns.join(','), format: 'json', h: 'index' },
    { ignore: [404] }
  );

  const names = rows.map((row) => row.index).filter((name): name is string => Boolean(name));
  if (names.length === 0) {
    log.info('No leftover capture indices to remove.');
    return;
  }

  await esClient.indices.delete({ index: names }, { ignore: [404] });
  log.info(
    `Removed ${names.length} leftover capture index/indices before reindex: ${names.join(', ')}`
  );
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Distinct `data_stream.dataset` keys from a `datasets` terms-agg response. */
function datasetBucketKeys(aggregations: Record<string, unknown> | undefined): string[] {
  const buckets =
    (aggregations?.datasets as { buckets?: Array<{ key: string | number }> })?.buckets ?? [];
  return buckets.map((bucket) => String(bucket.key));
}

/** Dataset names a config's index-level exclusions drop, parsed from `[cluster:]-logs-<dataset>-*`. */
function excludedDatasetNames(sourceIndex: string[]): Set<string> {
  const names = new Set<string>();
  for (const pattern of sourceIndex) {
    const bare = splitClusterAlias(pattern)[1];
    if (bare.startsWith('-logs-') && bare.endsWith('-*')) {
      names.add(bare.slice('-logs-'.length, -'-*'.length));
    }
  }
  return names;
}

/**
 * Best-effort: narrow a broad `logs-*` source to ONLY the datasets that actually carry
 * in-scope docs. `logs-*` resolves every dataset the source holds (hundreds), so the
 * remote reindex reads — and can 503 on — frozen shards of datasets that contribute
 * nothing (e.g. `logs-indexer.log` under a `serverless.project.id` scope).
 *
 * We INCLUDE the in-scope datasets rather than EXCLUDING the rest: with hundreds of
 * datasets the exclusion list overflows the source cluster's `_pit` URI (4096-byte HTTP
 * line), whereas the in-scope set is small and bounded. The captured slice is unchanged —
 * the reindex query still filters by scope∪symptom + time; this only trims which indices
 * ES searches. Symptom datasets are part of scope∪symptom, so the invariant holds.
 *
 * Mutates `config.sourceIndex`. Any failure (or an over-long include list) is swallowed —
 * the per-chunk retry already tolerates flaky shards, so this is an optimization only.
 */
async function restrictSourceToScopedDatasets({
  sourceClient,
  log,
  config,
}: {
  sourceClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<void> {
  try {
    const scoped = await sourceClient.search({
      index: config.sourceIndex.join(','),
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: buildSnapshotQuery(config),
      aggs: { datasets: { terms: { field: 'data_stream.dataset', size: 1000 } } },
    });

    // Honor any index-level exclusions already in the config (query-level `must_not`
    // datasets are already absent from these buckets, so only index-level ones remain).
    const excluded = excludedDatasetNames(config.sourceIndex);
    const datasets = datasetBucketKeys(
      scoped.aggregations as Record<string, unknown> | undefined
    ).filter((dataset) => !excluded.has(dataset));
    if (datasets.length === 0) {
      // No dataset resolved (e.g. docs without data_stream.dataset, or source down) —
      // keep the broad pattern so nothing is silently dropped.
      return;
    }

    // Reuse the CCS cluster prefix from the first include so includes target the same
    // remote (`<cluster>:logs-<dataset>-*`); a local source gets a bare `logs-<dataset>-*`.
    const firstInclude = config.sourceIndex.find((pattern) => !pattern.startsWith('-'));
    const [prefix] = splitClusterAlias(firstInclude ?? '');
    const includes = datasets.map((dataset) => `${prefix}logs-${dataset}-*`);

    if (includes.join(',').length > SOURCE_INDEX_MAX_CHARS) {
      log.warning(
        `In-scope dataset list too long (${includes.length} datasets); keeping the broad ` +
          `"${firstInclude}" source pattern.`
      );
      return;
    }

    config.sourceIndex = includes;
    log.info(
      `Restricted source to ${includes.length} in-scope dataset(s) (shrinks the frozen-shard ` +
        `surface): ${datasets.join(', ')}`
    );
  } catch (error) {
    log.warning(
      `Source dataset restriction skipped (${
        error instanceof Error ? error.message : String(error)
      }); continuing with the full source pattern.`
    );
  }
}

/** One reindex sub-window: a slice of the full time range small enough to scroll reliably. */
interface ReindexChunk {
  gte: string;
  lt: string;
  /** Approximate doc count from the planning histogram (0 when unknown). */
  estimated: number;
}

/** Splits [gte, lt) into fixed-duration chunks — the fallback when the histogram is unavailable. */
function fixedDurationChunks(gte: string, lt: string, chunkMs: number): ReindexChunk[] {
  const startMs = Date.parse(gte);
  const endMs = Date.parse(lt);
  const chunks: ReindexChunk[] = [];
  for (let s = startMs; s < endMs; s += chunkMs) {
    const e = Math.min(s + chunkMs, endMs);
    chunks.push({
      gte: s === startMs ? gte : toIso(s),
      lt: e === endMs ? lt : toIso(e),
      estimated: 0,
    });
  }
  return chunks.length > 0 ? chunks : [{ gte, lt, estimated: 0 }];
}

/**
 * Plans the reindex as a sequence of time chunks each ≈ `TARGET_CHUNK_DOCS`. Chunk sizes
 * come from a `@timestamp` histogram over the EXACT reindex query, so busy periods get
 * more, shorter chunks and quiet stretches are merged. Falls back to fixed-duration
 * chunks when the histogram can't be read (e.g. the source is momentarily unavailable) —
 * chunking must still happen so no single scroll spans the whole window.
 */
async function planReindexChunks({
  sourceClient,
  log,
  config,
}: {
  sourceClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<ReindexChunk[]> {
  const index = config.sourceIndex.join(',');
  const { gte, lt } = config.query.timeRange;

  let buckets: Array<{ key: number; doc_count: number }> = [];
  try {
    const response = await sourceClient.search({
      index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: buildSnapshotQuery(config),
      aggs: {
        timeline: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: CHUNK_HISTOGRAM_INTERVAL,
            min_doc_count: 0,
            extended_bounds: { min: gte, max: lt },
          },
        },
      },
    });
    buckets =
      (response.aggregations?.timeline as { buckets?: Array<{ key: number; doc_count: number }> })
        ?.buckets ?? [];
  } catch (error) {
    log.warning(
      `Chunk-planning histogram failed (${
        error instanceof Error ? error.message : String(error)
      }); falling back to fixed ${CHUNK_FALLBACK_MS / 3_600_000}h chunks.`
    );
    const fallback = fixedDurationChunks(gte, lt, CHUNK_FALLBACK_MS);
    log.info(`Reindex plan: ${fallback.length} fixed-duration chunk(s) over ${gte}..${lt}.`);
    return fallback;
  }

  if (buckets.length === 0) {
    return [{ gte, lt, estimated: 0 }];
  }

  // Greedily pack consecutive buckets until the next would push the group over target.
  const groups: Array<{ start: number; end: number; count: number }> = [];
  for (const bucket of buckets) {
    const bStart = bucket.key;
    const bEnd = bStart + CHUNK_HISTOGRAM_INTERVAL_MS;
    const current = groups[groups.length - 1];
    if (!current || (current.count > 0 && current.count + bucket.doc_count > TARGET_CHUNK_DOCS)) {
      groups.push({ start: bStart, end: bEnd, count: bucket.doc_count });
    } else {
      current.end = bEnd;
      current.count += bucket.doc_count;
    }
  }

  // Clamp the outer edges to the exact configured window; interior boundaries are
  // bucket-aligned and contiguous (group[i].end === group[i+1].start), so no overlap.
  const chunks: ReindexChunk[] = groups.map((group, i) => ({
    gte: i === 0 ? gte : toIso(group.start),
    lt: i === groups.length - 1 ? lt : toIso(group.end),
    estimated: group.count,
  }));
  log.info(
    `Reindex plan: ${chunks.length} chunk(s) over ${gte}..${lt} (target ≤ ${TARGET_CHUNK_DOCS} docs/chunk).`
  );
  return chunks;
}

/** Persisted per-chunk progress so an interrupted run resumes instead of restarting. */
interface ReindexProgress {
  /** Identifies the chunk plan this belongs to; a plan change invalidates the file. */
  planKey: string;
  /** Map of `${gte}|${lt}` → docs created, for chunks already captured. */
  done: Record<string, number>;
}

function reindexProgressPath(configPath: string, incidentId: string): string {
  return path.join(path.dirname(path.resolve(configPath)), `${incidentId}.reindex-progress.json`);
}

function chunkKey(chunk: ReindexChunk): string {
  return `${chunk.gte}|${chunk.lt}`;
}

function buildPlanKey(chunks: ReindexChunk[]): string {
  return JSON.stringify(chunks.map((chunk) => [chunk.gte, chunk.lt]));
}

/** Loads resumable progress iff the sidecar exists AND was written for this exact plan. */
function loadReindexProgress(file: string, planKey: string, log: ToolingLog): ReindexProgress {
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ReindexProgress;
      if (parsed.planKey === planKey && parsed.done && Object.keys(parsed.done).length > 0) {
        log.info(
          `Found resumable reindex progress (${
            Object.keys(parsed.done).length
          } chunk(s) done) → ${file}`
        );
        return parsed;
      }
    }
  } catch {
    log.warning(`Ignoring unreadable reindex progress file (${file}); starting fresh.`);
  }
  return { planKey, done: {} };
}

function saveReindexProgress(file: string, progress: ReindexProgress): void {
  fs.writeFileSync(file, JSON.stringify(progress), 'utf8');
}

function deleteReindexProgress(file: string): void {
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // best-effort cleanup
  }
}

/** Submits one chunk's reindex and awaits its task; throws on error/truncation so the caller retries. */
async function submitAndAwaitChunk({
  esClient,
  log,
  config,
  chunk,
  label,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
  chunk: ReindexChunk;
  label: string;
}): Promise<number> {
  const request: ReindexRequest = {
    // Submit asynchronously and poll — a frozen-tier scroll can outlast the client socket.
    wait_for_completion: false,
    // Scroll keep-alive, refreshed per batch. A generous value keeps the context alive
    // across slow frozen-tier thaws; short per-chunk scrolls make expiry rare regardless.
    scroll: '1h',
    source: {
      remote: {
        host: config.source.host,
        headers: { Authorization: `ApiKey ${config.resolvedApiKey}` },
        // Frozen (`partial-`) tier CCS reads routinely exceed the 30s default per batch.
        socket_timeout: '10m',
        connect_timeout: '2m',
      },
      index: config.sourceIndex,
      // Same scope, restricted to this chunk's sub-window. Reindex preserves the source
      // `_id` (the script only rewrites `_index`) and dest op_type defaults to `index`,
      // so re-running a chunk overwrites the same docs — a retry is idempotent.
      query: buildSnapshotQuery(config, { gte: chunk.gte, lt: chunk.lt }),
      // Tunable batch size (remote reindex has no `slices`); smaller survives a flaky source better.
      size: REINDEX_BATCH_DOCS,
    },
    // Routing script sends every doc to its original name; this nominal dest should stay empty.
    dest: { index: config.unroutedIndex },
    script: buildReindexScript(config),
  };

  const submit = await esClient.reindex(request, {
    requestTimeout: REINDEX_SUBMIT_REQUEST_TIMEOUT_MS,
  });
  const taskId = (submit as { task?: string | number }).task;
  if (taskId === undefined || taskId === null) {
    throw new Error('Reindex submit did not return a task id (async submit failed).');
  }
  return waitForReindexTask({
    esClient,
    log,
    taskId: String(taskId),
    incidentId: config.incident.id,
    maxWaitMs: REINDEX_CHUNK_MAX_WAIT_MS,
    label,
  });
}

/** Reindexes one chunk, retrying the whole chunk (idempotent) on error or truncation. */
async function reindexChunkWithRetry({
  esClient,
  log,
  config,
  chunk,
  index,
  total,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
  chunk: ReindexChunk;
  index: number;
  total: number;
}): Promise<number> {
  const label = `chunk ${index + 1}/${total} [${chunk.gte}..${chunk.lt}]`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= REINDEX_CHUNK_MAX_ATTEMPTS; attempt++) {
    try {
      log.info(
        `Reindexing ${label}${chunk.estimated ? ` (~${chunk.estimated} docs)` : ''} ` +
          `(attempt ${attempt}/${REINDEX_CHUNK_MAX_ATTEMPTS})`
      );
      return await submitAndAwaitChunk({ esClient, log, config, chunk, label });
    } catch (error) {
      lastError = error;
      if (attempt < REINDEX_CHUNK_MAX_ATTEMPTS) {
        log.warning(
          `${label} attempt ${attempt} failed: ${
            error instanceof Error ? error.message : String(error)
          }. Retrying (idempotent — source _id preserved)…`
        );
        await sleep(REINDEX_CHUNK_RETRY_DELAY_MS);
      }
    }
  }
  throw new Error(
    `Reindex ${label} failed after ${REINDEX_CHUNK_MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Reindexes the capture as a sequence of retryable time chunks (see `planReindexChunks`),
 * persisting per-chunk progress so an interrupted run resumes. Returns total docs created.
 */
async function remoteReindex({
  esClient,
  log,
  config,
  chunks,
  progress,
  progressFile,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
  chunks: ReindexChunk[];
  progress: ReindexProgress;
  progressFile: string;
}): Promise<number> {
  log.info(
    `Reindexing "${config.sourceIndex.join(', ')}" from ${config.source.host} → original index ` +
      `names in ${chunks.length} chunk(s)`
  );

  let created = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const key = chunkKey(chunk);
    const alreadyDone = progress.done[key];
    if (alreadyDone !== undefined) {
      created += alreadyDone;
      log.info(
        `  chunk ${i + 1}/${chunks.length} already captured (${alreadyDone} docs) — skipping.`
      );
      continue;
    }
    const chunkCreated = await reindexChunkWithRetry({
      esClient,
      log,
      config,
      chunk,
      index: i,
      total: chunks.length,
    });
    created += chunkCreated;
    progress.done[key] = chunkCreated;
    saveReindexProgress(progressFile, progress);
  }

  log.info(`Reindexed ${created} docs into their original index names`);
  return created;
}

/**
 * Polls one async reindex task to completion, logging progress. Throws on task error,
 * `timed_out`, per-doc failures, silent truncation (created < total, e.g. a frozen-tier
 * scroll-context expiry or dropped remote connection), or wait-budget exhaustion — each
 * is retryable by the caller because chunk retries are idempotent.
 */
async function waitForReindexTask({
  esClient,
  log,
  taskId,
  incidentId,
  maxWaitMs,
  label,
}: {
  esClient: Client;
  log: ToolingLog;
  taskId: string;
  incidentId: string;
  maxWaitMs: number;
  label: string;
}): Promise<number> {
  const deadline = Date.now() + maxWaitMs;

  while (true) {
    const task = await esClient.tasks.get(
      { task_id: taskId },
      { requestTimeout: REINDEX_SUBMIT_REQUEST_TIMEOUT_MS }
    );

    if (task.completed) {
      if (task.error) {
        throw new Error(`Reindex ${label} failed: ${JSON.stringify(task.error)}`);
      }
      const response = task.response as
        | { timed_out?: boolean; total?: number; created?: number; failures?: unknown[] }
        | undefined;
      if (response?.timed_out) {
        throw new Error(`Reindex ${label} timed out capturing incident ${incidentId}`);
      }
      const failures = (response?.failures ?? []) as Array<{
        index?: string;
        cause?: { type?: string; reason?: string };
      }>;
      if (failures.length > 0) {
        const reasons = failures
          .slice(0, 3)
          .map((f) => `${f.index ?? '?'}: ${f.cause?.reason ?? f.cause?.type ?? 'unknown'}`)
          .join(' | ');
        throw new Error(`Reindex ${label} had ${failures.length} failure(s): ${reasons}`);
      }
      const total = response?.total ?? 0;
      const createdSoFar = response?.created ?? 0;
      if (total > 0 && createdSoFar < total) {
        throw new Error(
          `Reindex ${label} truncated: created ${createdSoFar} of ${total} docs with no reported ` +
            `failure (source scroll ended early).`
        );
      }
      return createdSoFar;
    }

    if (Date.now() > deadline) {
      throw new Error(
        `Reindex ${label} did not finish within ${maxWaitMs / 1000}s. ` +
          `It may still be running server-side; check GET _tasks/${taskId}.`
      );
    }

    const status = (task.task?.status ?? {}) as { created?: number; total?: number };
    log.info(`  ${label}: ${status.created ?? '?'}/${status.total ?? '?'} docs`);
    await sleep(REINDEX_POLL_INTERVAL_MS);
  }
}

/**
 * Lists the local capture indices by the incident's capture patterns. Run AFTER
 * `deleteExistingCaptureIndices` (fresh run) — which removes anything already matching
 * these patterns — or over a resumed run's partial output, so everything matching is
 * exactly what this capture produced (no reliance on a before/after diff, which would
 * miss a resumed run's pre-existing partial indices).
 */
async function listCaptureIndices(
  esClient: Client,
  config: ResolvedIncidentConfig
): Promise<string[]> {
  const patterns = localCapturePatterns(config);
  const rows = await esClient.cat.indices(
    { index: patterns.join(','), format: 'json', h: 'index' },
    { ignore: [404] }
  );
  return rows
    .map((row) => row.index)
    .filter((name): name is string => Boolean(name))
    .sort();
}

/** Refreshes the captured indices and returns their per-index doc counts + total. */
async function countCapturedDocs({
  esClient,
  captured,
}: {
  esClient: Client;
  captured: string[];
}): Promise<{ total: number; docCounts: Record<string, number> }> {
  if (captured.length === 0) {
    return { total: 0, docCounts: {} };
  }

  await esClient.indices.refresh({ index: captured.join(',') }, { ignore: [404] });

  const rows = await esClient.cat.indices({
    index: captured.join(','),
    format: 'json',
    h: 'index,docs.count',
  });

  const docCounts: Record<string, number> = {};
  let total = 0;
  const capturedSet = new Set(captured);

  for (const row of rows) {
    const indexName = row.index ?? '';
    if (!capturedSet.has(indexName)) {
      continue;
    }
    const docs = Number(row['docs.count'] ?? 0);
    docCounts[indexName] = docs;
    total += docs;
  }

  return { total, docCounts };
}

export async function captureIncidentSnapshot({
  esClient,
  log,
  configPath,
  dryRun = false,
}: {
  esClient: Client;
  log: ToolingLog;
  /**
   * Path to the incident config file. In `--config` mode this is the user's
   * hand-written file; in `--incident-id` mode it is the `<id>.incident.yml` the
   * auto flow just derived and wrote.
   */
  configPath: string;
  dryRun?: boolean;
}): Promise<void> {
  if (!configPath) {
    throw new Error('Required: --config <path-to-incident-config.(yml|json)>');
  }

  const config = resolveIncidentConfig(readIncidentConfig(configPath));

  const snapshotName = generateIncidentSnapshotName(config.incident.id);
  const gcsPath = `gs://${NIGHTSHIFT_INCIDENT_BUCKET}/${config.gcsBasePath}`;

  log.info(
    `Incident ${config.incident.id}: "${config.incident.title}" | ` +
      `source: ${config.sourceIndex.join(', ')} | GCS: ${gcsPath}`
  );

  // 1. Prerequisite: source host must be whitelisted for remote reindex.
  await assertRemoteWhitelisted({ esClient, log, config });

  if (dryRun) {
    log.info('[dry-run] Reindex request body:');
    log.info(
      JSON.stringify(
        {
          source: {
            remote: { host: config.source.host, headers: { Authorization: 'ApiKey <redacted>' } },
            index: config.sourceIndex,
            query: buildSnapshotQuery(config),
          },
          dest: { index: config.unroutedIndex },
          script: buildReindexScript(config).source,
        },
        null,
        2
      )
    );
    log.info('[dry-run] Docs are routed to their original data-stream names.');
    log.info('[dry-run] Snapshot target:');
    log.info(
      `  repository=${NIGHTSHIFT_INCIDENT_BUCKET} snapshot=${snapshotName} ` +
        `base_path=${config.gcsBasePath}`
    );
    log.info('[dry-run] No changes made.');
    return;
  }

  // Safety guard: refuse to kick off a runaway reindex. A broad entity scope over a
  // multi-day window on busy infra can be tens of millions of docs (impractical,
  // especially from a frozen tier). The estimate comes from the probe.
  const estimated = config.snapshot?.expectedDocCount;
  if (estimated !== undefined && estimated > MAX_REINDEX_DOCS) {
    throw new Error(
      `Estimated ${estimated} docs to reindex exceeds the ${MAX_REINDEX_DOCS} safety limit. ` +
        `Narrow the scope before capturing: tighten the symptom (fewer entities), use a ` +
        `pod-level entity, exclude more datasets, or shorten the window. Re-run with --dry-run ` +
        `to inspect the derived config.`
    );
  }

  // 2. Ensure a high-priority, plain, dynamic:false template covers the capture indices
  //    (overrides the stack's logs-*-* data-stream template and tolerates raw,
  //    inconsistently-shaped log fields), plan the reindex as retryable time chunks,
  //    then reindex each chunk (routing every doc to its original name). A source client
  //    (same key as the remote reindex) drives the planning + dataset-exclusion probes.
  const sourceClient = createOverviewClient(config.source.host, config.resolvedApiKey);

  // Best-effort: narrow a broad logs-* source to only the in-scope datasets so the remote
  // reindex doesn't read (and 503 on) irrelevant frozen shards. Mutates config.sourceIndex,
  // so it must run BEFORE the template + chunk plan, which both derive from those patterns.
  await restrictSourceToScopedDatasets({ sourceClient, log, config });

  await ensureCaptureIndexTemplate({ esClient, log, config });

  // Plan the chunks and resume any prior partial run whose plan is unchanged. On a fresh
  // run, remove leftover capture indices (they share original names and would mix in);
  // on resume, keep them — completed chunks are exactly the partial output we continue.
  const chunks = await planReindexChunks({ sourceClient, log, config });
  const progressFile = reindexProgressPath(configPath, config.incident.id);
  const progress = loadReindexProgress(progressFile, buildPlanKey(chunks), log);
  const resuming = Object.keys(progress.done).length > 0;
  if (resuming) {
    log.info(
      `Resuming reindex: ${Object.keys(progress.done).length}/${chunks.length} chunk(s) already ` +
        `captured; leftover-cleanup skipped.`
    );
  } else {
    await deleteExistingCaptureIndices({ esClient, log, config });
  }

  const created = await remoteReindex({ esClient, log, config, chunks, progress, progressFile });

  // Full reindex succeeded across every chunk — drop the resume sidecar.
  deleteReindexProgress(progressFile);

  // Everything matching the capture patterns is exactly what this run produced (fresh
  // runs cleaned leftovers above; a resumed run's partial output is intentionally kept).
  const captured = await listCaptureIndices(esClient, config);

  // The capture indices now exist with their mappings, so the template's job is
  // done. Remove it immediately: at priority 500 over `logs-*` it would otherwise
  // hijack later restore/replay of these indices (forcing plain indices instead of
  // data streams). A future capture re-creates it in `ensureCaptureIndexTemplate`.
  await esClient.indices.deleteIndexTemplate(
    { name: `incident-capture-${config.incident.id}` },
    { ignore: [404] }
  );

  if (captured.includes(config.unroutedIndex)) {
    log.warning(
      `Some docs did not route to an original name and landed in "${config.unroutedIndex}". ` +
        `They are included in the snapshot; inspect that index to find the unrouted source.`
    );
  }

  if (captured.length === 0) {
    throw new Error(
      `Reindex created no new indices (reindexed ${created} docs). Check the time range / ` +
        `query filter, or whether these indices already existed in the local ES.`
    );
  }

  // 3. Verify the destination count against the probe's estimate, if provided. Use a
  //    tolerance, not equality: the probe counted the source earlier, and live logs-*
  //    drifts (new docs, frozen-shard shifts, approximate CCS totals). A shortfall beyond
  //    tolerance signals real under-capture; an overshoot just means the source grew.
  const { total: count, docCounts } = await countCapturedDocs({ esClient, captured });
  log.info(
    `Captured ${count} docs across ${captured.length} index/indices (original names): ` +
      `${JSON.stringify(docCounts)}`
  );

  const expected = config.snapshot?.expectedDocCount;
  if (expected !== undefined) {
    const floor = Math.floor(expected * (1 - DOC_COUNT_TOLERANCE));
    if (count < floor) {
      throw new Error(
        `Doc count short: expected ~${expected} (min ${floor} at ${DOC_COUNT_TOLERANCE * 100}% ` +
          `tolerance), got ${count} across the captured indices. The reindex likely under-captured ` +
          `— re-run (it resumes from the sidecar), or re-check the time range / query filter.`
      );
    }
    if (count > expected) {
      log.info(
        `Captured ${count} docs vs expected ~${expected} (source grew since the probe) — OK.`
      );
    }
  }

  // 4. Register the GCS repository (verify=true catches missing keystore creds early).
  await registerIncidentGcsRepository({
    esClient,
    log,
    basePath: config.gcsBasePath,
    verify: true,
  });

  // 5. Create the snapshot with native, immutable, bucket-local metadata. ES caps
  //    native snapshot metadata at 1024 bytes, so keep it to the small summary
  //    fields (a count, not the full index list); the captured index list, its
  //    per-index doc counts, and the symptom query go in the manifest.
  const timeRange = `${config.query.timeRange.gte}/${config.query.timeRange.lt}`;
  const metadata = {
    incident_id: config.incident.id,
    incident_title: config.incident.title,
    incident_date: config.incident.date,
    source_cluster: config.source.cluster ?? '',
    time_range: timeRange,
    doc_count: count,
    slack_channel: config.incident.slackChannel ?? '',
    gcs_path: gcsPath,
    index_count: captured.length,
  };

  const snapshotResult = await createIncidentSnapshot({
    esClient,
    log,
    snapshotName,
    indices: captured.join(','),
    metadata,
  });

  // 6. Drop a bucket-local manifest.json so the incident is identifiable from the
  //    GCS console alone, and to hold the fields too large for native metadata:
  //    the captured index list, per-index doc counts, and the "symptom" replay query.
  await uploadManifest({
    log,
    basePath: config.gcsBasePath,
    manifest: {
      ...metadata,
      captured_indices: captured,
      doc_counts: docCounts,
      snapshot_name: snapshotName,
      repository: NIGHTSHIFT_INCIDENT_BUCKET,
      reindexed_docs: created,
      captured_at: new Date().toISOString(),
      // Narrow "symptom" query as Query DSL (provenance/replay); kept out of the
      // size-limited snapshot metadata and stored here instead.
      symptom_query: buildSymptomQuery(config) ?? null,
    },
  });

  // 7. Summary.
  log.info('');
  log.info('='.repeat(70));
  log.info(`SNAPSHOT CREATED — incident ${config.incident.id}`);
  log.info('='.repeat(70));
  log.info(
    `  ${snapshotResult.successfulShards ?? '?'}/${snapshotResult.totalShards ?? '?'} shards | ` +
      `indices (original names): ${snapshotResult.indices.join(', ')}`
  );
  log.info(`  GCS: ${gcsPath}`);
  log.info('');
  log.info('Recover the incident↔snapshot mapping directly from the bucket repository:');
  log.info(`  GET _snapshot/${NIGHTSHIFT_INCIDENT_BUCKET}/_all`);
}
