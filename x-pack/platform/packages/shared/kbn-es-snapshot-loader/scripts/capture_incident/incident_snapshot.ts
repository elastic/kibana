/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import {
  createIncidentSnapshot,
  generateIncidentSnapshotName,
  registerIncidentGcsRepository,
  uploadManifest,
} from './incident_gcs';
import { NIGHTSHIFT_INCIDENT_BUCKET } from './constants';

// Large, multi-dataset slices from a frozen (`partial-`) tier over CCS reindex
// slowly, so submit the reindex asynchronously (wait_for_completion=false) and
// poll the task rather than holding one long HTTP connection that would hit the
// client socket timeout.
const REINDEX_SUBMIT_REQUEST_TIMEOUT_MS = 60 * 1000;
const REINDEX_POLL_INTERVAL_MS = 15 * 1000;
const REINDEX_MAX_WAIT_MS = 4 * 60 * 60 * 1000;

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
    .filter((pattern) => !pattern.startsWith('-'))
    .map((pattern) => {
      const colon = pattern.indexOf(':');
      return colon >= 0 ? pattern.slice(colon + 1) : pattern;
    });
  return [...new Set([...fromSource, `incident-${config.incident.id}-*`])];
}

/**
 * Field types that map 1:1 from `_field_caps` output to a mapping `{ type }` with
 * no required parameters. Types needing params (`scaled_float`, `constant_keyword`,
 * `aggregate_metric_double`, …) and the structural `object`/`nested` are skipped —
 * left to `dynamic: false` (preserved in `_source`, not indexed).
 */
const PARAM_FREE_FIELD_TYPES = new Set<string>([
  'keyword',
  'constant_keyword',
  'wildcard',
  'text',
  'match_only_text',
  'version',
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'unsigned_long',
  'boolean',
  'date',
  'date_nanos',
  'ip',
  'geo_point',
  'flattened',
  'binary',
]);

/**
 * Fallback mapping (dotted-key form) used only if `_field_caps` can't be read from
 * the source — the core ECS fields symptom replay / triage rely on.
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
 * Derives the capture index mapping FROM THE SOURCE using `_field_caps` (a
 * read-level API the source key can call — unlike `_mapping`). Every field that
 * resolves to a single, unambiguous, param-free type is mapped with that type.
 * Fields that are `object`/`nested`, that report multiple conflicting types across
 * the source indices (the object-vs-scalar case), or that need mapping params are
 * skipped and left to `dynamic: false`. Falls back to the core ECS fields if
 * `_field_caps` is unavailable.
 */
async function deriveSourceMappings({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<Record<string, MappingProperty>> {
  try {
    const response = await esClient.fieldCaps(
      { index: config.sourceIndex, fields: '*' },
      { requestTimeout: 120 * 1000 }
    );

    const properties: Record<string, MappingProperty> = {};
    for (const [name, byType] of Object.entries(response.fields ?? {})) {
      if (name.startsWith('_')) {
        continue; // ES metadata fields (_id, _source, _seq_no, …)
      }
      const types = Object.keys(byType).filter((type) => type !== 'unmapped');
      // Ambiguous (>1 type across indices, e.g. object-vs-scalar) or absent — skip.
      if (types.length !== 1) {
        continue;
      }
      const [type] = types;
      if (!PARAM_FREE_FIELD_TYPES.has(type)) {
        continue; // object/nested or a param-typed field — leave to dynamic:false
      }
      properties[name] = { type } as MappingProperty;
    }

    const count = Object.keys(properties).length;
    if (count === 0) {
      throw new Error('no mappable fields returned');
    }
    log.info(`Derived ${count} field mappings from the source via _field_caps`);
    return properties;
  } catch (err) {
    log.warning(
      `Could not derive mappings from source via _field_caps ` +
        `(${err instanceof Error ? err.message : String(err)}); falling back to core ECS fields.`
    );
    return { ...CORE_CAPTURE_MAPPINGS };
  }
}

/**
 * Ensures a high-priority index template for the capture indices. It does three
 * jobs that the reindex + restore depend on:
 *
 *  1. `dynamic: false` — raw production logs carry fields with inconsistent shapes
 *     (e.g. `volume` as an object in some docs, a scalar in others). A dynamically
 *     mapped index rejects the minority shape with a mapper_parsing error, failing
 *     the reindex. `dynamic: false` keeps every field intact in `_source` without
 *     building conflicting mappings.
 *  2. Source-derived field mappings (`deriveSourceMappings` via `_field_caps`) — so
 *     the restored index is searchable/aggregatable on the fields the source
 *     actually has (not a forced, hardcoded set), while conflicting/param fields
 *     stay in `_source` under `dynamic: false`.
 *  3. Plain indices (no `data_stream`) at priority 500 — the stack ships a
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
  const properties = await deriveSourceMappings({ esClient, log, config });

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
      `${Object.keys(properties).length} source-derived fields) for ${patterns.join(', ')}`
  );
}

/**
 * Deletes any local indices left over from a previous capture that match this
 * incident's patterns. Captures route docs to their ORIGINAL data-stream names
 * (e.g. `logs-elasticsearch.server-default`), so different incidents collide on the
 * same local index. Without this, a re-run would (a) append new docs into the
 * leftover index (mixing incidents) and (b) have the before/after diff treat that
 * index as pre-existing and silently drop it from the new snapshot. Deleting by
 * resolved concrete names (not a raw wildcard) avoids `action.destructive_requires_name`.
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

async function remoteReindex({
  esClient,
  log,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  config: ResolvedIncidentConfig;
}): Promise<number> {
  const query = buildSnapshotQuery(config);
  const sourceIndex = config.sourceIndex.join(', ');

  const request: ReindexRequest = {
    wait_for_completion: true,
    source: {
      remote: {
        host: config.source.host,
        headers: { Authorization: `ApiKey ${config.resolvedApiKey}` },
        // The remote source defaults to a 30s socket timeout per scroll batch,
        // which frozen (`partial-`) tier CCS reads routinely exceed. Raise both so
        // slow batches don't abort the reindex with a socket_timeout_exception.
        socket_timeout: '5m',
        connect_timeout: '2m',
      },
      index: config.sourceIndex,
      query,
      // Larger scroll batches mean fewer round trips to the slow frozen source
      // (remote reindex does not support `slices`, so batch size is the main lever).
      size: 5000,
    },
    // The painless script routes every doc to its original name, so this nominal
    // dest should never receive documents; docs here flag a routing gap.
    dest: { index: config.unroutedIndex },
    script: buildReindexScript(config),
  };

  log.info(`Reindexing "${sourceIndex}" from ${config.source.host} → original index names (async)`);

  const submit = await esClient.reindex(
    { ...request, wait_for_completion: false },
    { requestTimeout: REINDEX_SUBMIT_REQUEST_TIMEOUT_MS }
  );

  const taskId = (submit as { task?: string | number }).task;
  if (taskId === undefined || taskId === null) {
    throw new Error('Reindex submit did not return a task id (async submit failed).');
  }

  const created = await waitForReindexTask({
    esClient,
    log,
    taskId: String(taskId),
    incidentId: config.incident.id,
  });
  log.info(`Reindexed ${created} docs into their original index names`);
  return created;
}

/**
 * Polls an async reindex task to completion, logging progress. Throws on task
 * error, `timed_out`, per-doc failures, or if the overall wait budget is exceeded.
 */
async function waitForReindexTask({
  esClient,
  log,
  taskId,
  incidentId,
}: {
  esClient: Client;
  log: ToolingLog;
  taskId: string;
  incidentId: string;
}): Promise<number> {
  const deadline = Date.now() + REINDEX_MAX_WAIT_MS;

  while (true) {
    const task = await esClient.tasks.get(
      { task_id: taskId },
      { requestTimeout: REINDEX_SUBMIT_REQUEST_TIMEOUT_MS }
    );

    if (task.completed) {
      if (task.error) {
        throw new Error(`Reindex task ${taskId} failed: ${JSON.stringify(task.error)}`);
      }
      const response = task.response as
        | { timed_out?: boolean; created?: number; failures?: unknown[] }
        | undefined;
      if (response?.timed_out) {
        throw new Error(`Reindex timed out capturing incident ${incidentId}`);
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
        throw new Error(
          `Reindex had ${failures.length} failure(s) capturing incident ${incidentId}: ${reasons}`
        );
      }
      return response?.created ?? 0;
    }

    if (Date.now() > deadline) {
      throw new Error(
        `Reindex task ${taskId} did not finish within ${REINDEX_MAX_WAIT_MS / 1000}s. ` +
          `It is still running server-side; check GET _tasks/${taskId}.`
      );
    }

    const status = (task.task?.status ?? {}) as { created?: number; total?: number };
    log.info(`  reindex progress: ${status.created ?? '?'}/${status.total ?? '?'} docs`);
    await new Promise((resolve) => setTimeout(resolve, REINDEX_POLL_INTERVAL_MS));
  }
}

/**
 * Lists local user indices (excludes system/hidden `.`-prefixed indices). Used to
 * diff the index set before vs after the reindex so the captured indices — named
 * after their original data streams — can be identified and snapshotted precisely,
 * without relying on a naming prefix.
 */
async function listUserIndices(esClient: Client): Promise<Set<string>> {
  const rows = await esClient.cat.indices({ format: 'json', h: 'index' });
  const names = new Set<string>();
  for (const row of rows) {
    const name = row.index ?? '';
    if (name && !name.startsWith('.')) {
      names.add(name);
    }
  }
  return names;
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

  // 2. Ensure a high-priority, plain, dynamic:false template covers the capture
  //    indices (overrides the stack's logs-*-* data-stream template and tolerates
  //    raw, inconsistently-shaped log fields), remove any leftover capture indices
  //    from a previous incident (they share original names and would mix in / be
  //    silently dropped by the diff), then reindex, routing each doc to its original
  //    name. Diff the local index set before vs after so we capture exactly the
  //    indices this reindex produced (named after their source streams).
  await ensureCaptureIndexTemplate({ esClient, log, config });
  await deleteExistingCaptureIndices({ esClient, log, config });
  const before = await listUserIndices(esClient);
  const created = await remoteReindex({ esClient, log, config });
  const after = await listUserIndices(esClient);
  const captured = [...after].filter((name) => !before.has(name)).sort();

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

  // 3. Verify the destination count (against the incident doc's known count, if provided).
  const { total: count, docCounts } = await countCapturedDocs({ esClient, captured });
  log.info(
    `Captured ${count} docs across ${captured.length} index/indices (original names): ` +
      `${JSON.stringify(docCounts)}`
  );

  const expected = config.snapshot?.expectedDocCount;
  if (expected !== undefined && count !== expected) {
    throw new Error(
      `Doc count mismatch: expected ${expected}, got ${count} across the captured indices. ` +
        `Re-check the incident's time range / query filter, or update snapshot.expectedDocCount.`
    );
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
