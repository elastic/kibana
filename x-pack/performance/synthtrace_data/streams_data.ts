/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KibanaServer } from '@kbn/ftr-common-functional-services';
import type { ToolingLog } from '@kbn/tooling-log';
import { generateArchive } from '@kbn/streams-plugin/server/lib/content';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { emptyAssets } from '@kbn/streams-schema';

const PUBLIC_API_HEADERS = {
  'kbn-xsrf': 'streams-perf-test',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

/**
 * The root wired stream to fork children from.
 * After the logs → logs.otel / logs.ecs split, `enableStreams()` no longer
 * creates a plain `logs` root on fresh installs. Use `logs.otel` which is
 * guaranteed to exist after enablement.
 */
const WIRED_ROOT_STREAM = 'logs.otel';

const INTERNAL_API_HEADERS = {
  'kbn-xsrf': 'streams-perf-test',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

/** Batch size for parallel classic stream creation requests */
const CLASSIC_STREAM_BATCH_SIZE = 5;

/** Max retries for transient errors (lock contention) */
const MAX_RETRIES = 5;

/** Base delay between retries in ms */
const RETRY_BASE_DELAY_MS = 3000;

/**
 * Check if an error is an Axios response error with the given status code.
 */
function isConflictError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 409;
}

/**
 * Check if an error is a retryable lock contention error (HTTP 422).
 */
function isLockContentionError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 422;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enable wired streams. Required before creating any wired streams or forking.
 * Idempotent — safe to call if already enabled.
 */
export async function enableStreams(kibanaServer: KibanaServer, log: ToolingLog) {
  log.info('Enabling wired streams...');
  try {
    await kibanaServer.request({
      path: '/api/streams/_enable',
      method: 'POST',
      headers: PUBLIC_API_HEADERS,
      body: {},
    });
    log.info('Wired streams enabled');
  } catch (error) {
    if (isConflictError(error)) {
      log.info('Wired streams already enabled, continuing');
    } else {
      throw error;
    }
  }
}

/**
 * Create a single classic stream via the internal API.
 * Idempotent — ignores 409 if the stream already exists.
 * Retries on 422 (lock contention) with exponential backoff.
 */
async function createSingleClassicStream(kibanaServer: KibanaServer, name: string): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await kibanaServer.request({
        path: '/internal/streams/_create_classic',
        method: 'POST',
        headers: INTERNAL_API_HEADERS,
        body: {
          name,
          description: '',
          ingest: {
            processing: { steps: [] },
            lifecycle: { inherit: {} },
            settings: {},
            failure_store: { inherit: {} },
            classic: {},
          },
        },
      });
      return;
    } catch (error) {
      if (isConflictError(error)) {
        // Stream already exists — skip
        return;
      }
      if (isLockContentionError(error) && attempt < MAX_RETRIES) {
        // Lock contention — wait and retry with exponential backoff
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Create multiple classic streams in parallel batches.
 * Uses batching to avoid overwhelming Elasticsearch.
 */
export async function createClassicStreams(
  kibanaServer: KibanaServer,
  log: ToolingLog,
  count: number,
  prefix: string = 'logs-perf-classic'
) {
  log.info(`Creating ${count} classic streams with prefix '${prefix}'...`);

  const names = Array.from({ length: count }, (_, i) => `${prefix}-${String(i).padStart(5, '0')}`);

  let created = 0;
  for (let i = 0; i < names.length; i += CLASSIC_STREAM_BATCH_SIZE) {
    const batch = names.slice(i, i + CLASSIC_STREAM_BATCH_SIZE);
    await Promise.all(batch.map((n) => createSingleClassicStream(kibanaServer, n)));
    created += batch.length;

    if (created % 500 === 0 || created === count) {
      log.info(`  Created ${created}/${count} classic streams`);
    }

    // Delay between batches to reduce lock contention on the streams backend
    if (i + CLASSIC_STREAM_BATCH_SIZE < names.length) {
      await sleep(1500);
    }
  }

  log.info(`Finished creating ${count} classic streams`);
}

/**
 * Create a large number of unmanaged Elasticsearch data streams directly via the ES API.
 * This bypasses the Kibana Streams backend global lock, enabling fast creation of thousands
 * of data streams. The Streams listing page auto-discovers these as unmanaged classic streams.
 *
 * Uses the ES _bulk API to auto-create data streams via indexing. When a bulk request targets
 * a non-existent data stream that matches an index template, ES auto-creates it. Crucially,
 * ES batches auto-create operations within a single bulk call into a single cluster state
 * update, making this dramatically faster than individual createDataStream() calls which each
 * trigger separate cluster state updates and overwhelm the master node.
 */
export async function createBulkDataStreams(
  es: Client,
  log: ToolingLog,
  count: number,
  prefix: string = 'logs-perf-classic'
) {
  log.info(`Creating ${count} unmanaged data streams with prefix '${prefix}' via ES bulk API...`);

  // 1. Raise max shards per node to accommodate all test data + system indices.
  //    In ES 9.x each data stream creates 2 shards (write index + failure store backing index),
  //    so 5000 data streams = ~10000 shards. On top of that, Kibana + ES system indices
  //    (.kibana*, .security*, .alerts*, .fleet*, .async-search, wired streams, etc.) need
  //    additional capacity. Previous limits of 6000, 8000, and 10000 were all exhausted in CI.
  //    Using count * 4 provides generous headroom: 2x for failure stores + 2x for system indices.
  const maxShardsPerNode = count * 4;
  await es.cluster.putSettings({
    persistent: { 'cluster.max_shards_per_node': String(maxShardsPerNode) },
  });
  log.info(`  Raised cluster.max_shards_per_node to ${maxShardsPerNode}`);

  // 2. Create an index template matching the naming pattern
  await es.indices.putIndexTemplate({
    name: 'perf-classic-streams-template',
    index_patterns: [`${prefix}-*`],
    data_stream: {},
    template: {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    },
  });
  log.info('  Index template created');

  // 3. Auto-create data streams via bulk indexing.
  //    Each bulk request creates up to BULK_BATCH_SIZE data streams by indexing a seed document.
  //    ES batches the auto-create cluster state changes within a single bulk call, avoiding
  //    the master node task queue congestion that individual createDataStream() calls cause.
  const BULK_BATCH_SIZE = 250;
  const names = Array.from({ length: count }, (_, i) => `${prefix}-${String(i).padStart(5, '0')}`);
  const timestamp = new Date().toISOString();

  let created = 0;
  for (let i = 0; i < names.length; i += BULK_BATCH_SIZE) {
    const batch = names.slice(i, i + BULK_BATCH_SIZE);
    const operations = batch.flatMap((name) => [
      { create: { _index: name } },
      { '@timestamp': timestamp, message: 'init' },
    ]);

    await es.bulk({ operations, refresh: false });
    created += batch.length;

    if (created % 500 === 0 || created === count) {
      log.info(`  Created ${created}/${count} data streams`);
    }
  }

  log.info(`Finished creating ${count} unmanaged data streams`);
}

/**
 * Fork a child wired stream from a parent via the public API.
 * Idempotent — ignores 409 if the child stream already exists.
 */
async function forkStream(
  kibanaServer: KibanaServer,
  parent: string,
  childName: string,
  conditionField: string,
  conditionValue: string
): Promise<void> {
  try {
    await kibanaServer.request({
      path: `/api/streams/${parent}/_fork`,
      method: 'POST',
      headers: PUBLIC_API_HEADERS,
      body: {
        stream: { name: childName },
        where: {
          field: conditionField,
          eq: conditionValue,
        },
        status: 'enabled',
      },
    });
  } catch (error) {
    if (isConflictError(error)) {
      // Child stream already exists — skip
    } else {
      throw error;
    }
  }
}

/**
 * Create a wired stream hierarchy: children forked from the root wired stream.
 * Requires wired streams to be enabled first (call enableStreams).
 *
 * Creates:
 *   logs.otel
 *   ├── logs.otel.child1  (routes on resource.attributes.service.name == 'service-1')
 *   ├── logs.otel.child2  (routes on resource.attributes.service.name == 'service-2')
 *   └── logs.otel.child3  (routes on resource.attributes.service.name == 'service-3')
 */
export async function createWiredStreamHierarchy(kibanaServer: KibanaServer, log: ToolingLog) {
  log.info('Creating wired stream hierarchy...');

  const children = [
    { name: `${WIRED_ROOT_STREAM}.child1`, conditionValue: 'service-1' },
    { name: `${WIRED_ROOT_STREAM}.child2`, conditionValue: 'service-2' },
    { name: `${WIRED_ROOT_STREAM}.child3`, conditionValue: 'service-3' },
  ];

  // Fork children sequentially — each fork modifies the parent's routing
  for (const child of children) {
    log.info(`  Forking ${child.name} from ${WIRED_ROOT_STREAM}...`);
    await forkStream(
      kibanaServer,
      WIRED_ROOT_STREAM,
      child.name,
      'resource.attributes.service.name',
      child.conditionValue
    );
  }

  log.info('Wired stream hierarchy created');
}

/**
 * Full setup for the streams listing page journey (hybrid approach):
 * - Enable wired streams
 * - Create wired stream hierarchy (1 root + 3 children)
 * - Create 5000 unmanaged data streams via ES API (fast, ~10-30s)
 * - Create ~20 managed classic streams via Streams API (for realistic mix)
 */
export async function setupListingPageData(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog
) {
  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  // Bulk: 5000 unmanaged data streams via ES API (bypasses Streams backend lock)
  await createBulkDataStreams(es, log, 5000);

  // Small set: 20 managed classic streams via Streams API (for listing page mix)
  await createClassicStreams(kibanaServer, log, 20);
}

/**
 * Setup for journeys that need a single wired stream with children.
 * - Enable wired streams
 * - Create wired stream hierarchy
 */
export async function setupWiredStreams(kibanaServer: KibanaServer, log: ToolingLog) {
  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);
}

// ---------------------------------------------------------------------------
// Phase 5: Large wired stream hierarchy
// ---------------------------------------------------------------------------

type WiredHierarchyStrategy = 'fork' | 'import';

/** Default child count for the large wired hierarchy */
const DEFAULT_WIRED_HIERARCHY_COUNT = 100;

/**
 * Phase 5A — Create a large wired hierarchy by serially forking children from the root stream.
 * Each fork acquires the global lock, so this is O(N) in lock acquisitions.
 * Practical for up to ~100 children; for 1000+ use the 'import' strategy.
 */
async function createLargeWiredHierarchyViaFork(
  kibanaServer: KibanaServer,
  log: ToolingLog,
  count: number
) {
  log.info(`Creating ${count} wired child streams via serial fork...`);

  for (let i = 1; i <= count; i++) {
    const childName = `${WIRED_ROOT_STREAM}.perf_child_${String(i).padStart(4, '0')}`;
    const conditionValue = `perf-service-${i}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await forkStream(
          kibanaServer,
          WIRED_ROOT_STREAM,
          childName,
          'resource.attributes.service.name',
          conditionValue
        );
        break;
      } catch (error) {
        if (isLockContentionError(error) && attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          log.warning(
            `  Lock contention forking ${childName}, retry ${
              attempt + 1
            }/${MAX_RETRIES} after ${delay}ms`
          );
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }

    if (i % 10 === 0 || i === count) {
      log.info(`  Forked ${i}/${count} wired child streams`);
    }
  }

  log.info(`Finished creating ${count} wired child streams via fork`);
}

/**
 * Build content pack entries for a batch of wired hierarchy children.
 *
 * The root entry includes routing ONLY for the current batch's children.
 * The content import handler's `asTree()` validates that every routing destination
 * exists within the pack entries, so we cannot use cumulative routing (which
 * would reference children from previous batches that aren't in the current pack).
 *
 * After all batches complete, a separate API call updates the root's routing
 * to include all children.
 */
function buildBatchedContentPackEntries(batchStart: number, batchEnd: number) {
  const batchRouting = [];
  for (let i = batchStart; i <= batchEnd; i++) {
    batchRouting.push({
      destination: `perf_child_${String(i).padStart(4, '0')}`,
      where: { field: 'resource.attributes.service.name', eq: `perf-service-${i}` },
      status: 'enabled' as const,
    });
  }

  const childEntries = [];
  for (let i = batchStart; i <= batchEnd; i++) {
    childEntries.push({
      type: 'stream' as const,
      name: `perf_child_${String(i).padStart(4, '0')}`,
      request: {
        stream: {
          description: '',
          ingest: {
            processing: { steps: [] as never[] },
            settings: {},
            wired: { fields: {}, routing: [] as never[] },
            lifecycle: { inherit: {} },
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
        queries: [] as never[],
      },
    });
  }

  const rootEntry = {
    type: 'stream' as const,
    name: ROOT_STREAM_ID,
    request: {
      stream: {
        description: '',
        ingest: {
          processing: { steps: [] as never[] },
          settings: {},
          wired: { fields: {}, routing: batchRouting },
          lifecycle: { inherit: {} },
          failure_store: { inherit: {} },
        },
      },
      ...emptyAssets,
      queries: [] as never[],
    },
  };

  return [rootEntry, ...childEntries];
}

/**
 * Upload a content pack zip to the Kibana Streams content import API.
 * Constructs raw multipart/form-data since KbnClient.request() does not
 * natively support file uploads.
 */
async function uploadContentPack(
  kibanaServer: KibanaServer,
  streamName: string,
  archiveBuffer: Buffer,
  include: object
) {
  const boundary = `----FormBoundary${Date.now()}`;
  const includeJson = JSON.stringify(include);

  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="include"\r\n\r\n` +
        `${includeJson}\r\n`
    ),
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="content"; filename="content.zip"\r\n` +
        `Content-Type: application/zip\r\n\r\n`
    ),
    archiveBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];

  const body = Buffer.concat(parts);

  await kibanaServer.request({
    path: `/api/streams/${streamName}/content/import`,
    method: 'POST',
    headers: {
      ...PUBLIC_API_HEADERS,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body as unknown as Record<string, unknown>,
  });
}

/**
 * Update the root stream's routing to include all wired children.
 *
 * After batched content imports, each batch overwrites the root's routing with
 * only that batch's children. This final call sets the complete routing table
 * via `PUT /api/streams/${WIRED_ROOT_STREAM}/_ingest` so all children are routable.
 */
async function updateRootRouting(kibanaServer: KibanaServer, log: ToolingLog, count: number) {
  log.info(`Updating root stream routing to include all ${count} children...`);

  const allRouting = [];
  for (let i = 1; i <= count; i++) {
    allRouting.push({
      destination: `${WIRED_ROOT_STREAM}.perf_child_${String(i).padStart(4, '0')}`,
      where: { field: 'resource.attributes.service.name', eq: `perf-service-${i}` },
      status: 'enabled' as const,
    });
  }

  // Fetch current ingest settings so we preserve lifecycle/failure_store/processing/fields.
  // Root streams cannot use `inherit` for lifecycle or failure_store — they must keep
  // their current concrete values or the server rejects with 400.
  const response = await kibanaServer.request<{ ingest: Record<string, unknown> }>({
    path: `/api/streams/${WIRED_ROOT_STREAM}/_ingest`,
    method: 'GET',
    headers: PUBLIC_API_HEADERS,
  });
  log.info('Fetched current root stream ingest settings');

  const currentIngest = response.data;
  const { processing, settings, lifecycle, failure_store, wired } = currentIngest.ingest as {
    processing: { steps: unknown[]; updated_at?: string };
    settings: Record<string, unknown>;
    lifecycle: Record<string, unknown>;
    failure_store: Record<string, unknown>;
    wired: { fields: Record<string, unknown>; routing: unknown[] };
  };

  // Strip updated_at from processing — the server sets it on write
  const { updated_at: _updatedAt, ...processingWithoutTimestamp } = processing;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await kibanaServer.request({
        path: `/api/streams/${WIRED_ROOT_STREAM}/_ingest`,
        method: 'PUT',
        headers: PUBLIC_API_HEADERS,
        body: {
          ingest: {
            processing: processingWithoutTimestamp,
            settings,
            wired: { fields: wired.fields, routing: allRouting },
            lifecycle,
            failure_store,
          },
        },
      });
      break;
    } catch (err) {
      if (isConflictError(err) && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * attempt;
        log.warning(
          `Root routing update: 409 conflict on attempt ${attempt}, retrying in ${delay}ms...`
        );
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  log.info(`Root stream routing updated with ${count} routing rules`);
}

/**
 * Phase 5B — Create a large wired hierarchy via batched content imports.
 *
 * A single content import with 1000+ entries causes Kibana to OOM (the backend's
 * bulkUpsert fires ~5000 concurrent ES requests for index templates, component
 * templates, and data streams). Batching into chunks of IMPORT_BATCH_SIZE keeps
 * each import within proven memory limits.
 *
 * Each batch's root entry only includes routing for that batch's children (the
 * content import handler's `asTree()` requires all routing destinations to exist
 * in the pack entries). After all batches, `updateRootRouting()` sets the complete
 * routing table via the ingest API.
 */
async function createLargeWiredHierarchyViaImport(
  kibanaServer: KibanaServer,
  log: ToolingLog,
  count: number
) {
  const IMPORT_BATCH_SIZE = 100;
  const totalBatches = Math.ceil(count / IMPORT_BATCH_SIZE);

  log.info(
    `Creating ${count} wired child streams via content import ` +
      `(${totalBatches} batches of up to ${IMPORT_BATCH_SIZE})...`
  );

  await kibanaServer.uiSettings.update({
    'observability:streamsEnableContentPacks': true,
  });
  log.info('  Enabled content packs feature flag');

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * IMPORT_BATCH_SIZE + 1;
    const batchEnd = Math.min((batchIndex + 1) * IMPORT_BATCH_SIZE, count);

    const entries = buildBatchedContentPackEntries(batchStart, batchEnd);
    log.info(
      `  Batch ${batchIndex + 1}/${totalBatches}: ` +
        `${entries.length} entries (children ${batchStart}-${batchEnd})`
    );

    const archiveBuffer = await generateArchive(
      {
        name: `perf-wired-hierarchy-batch-${batchIndex + 1}`,
        description: `Batch ${batchIndex + 1} of ${totalBatches}`,
        version: '1.0.0',
      },
      entries
    );
    log.info(
      `  Batch ${batchIndex + 1}/${totalBatches}: ` +
        `archive ${Math.round(archiveBuffer.length / 1024)} KB, importing...`
    );

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await uploadContentPack(kibanaServer, WIRED_ROOT_STREAM, archiveBuffer, {
          objects: { all: {} },
        });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        if (isConflictError(err) && attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * attempt;
          log.warning(
            `  Batch ${
              batchIndex + 1
            }/${totalBatches}: 409 conflict on attempt ${attempt}, retrying in ${delay}ms...`
          );
          await sleep(delay);
        } else {
          throw err;
        }
      }
    }
    if (lastError) throw lastError;
    log.info(`  Batch ${batchIndex + 1}/${totalBatches}: imported successfully`);

    if (batchIndex < totalBatches - 1) {
      await sleep(3000);
    }
  }

  // After all batches, set the complete routing table on the root stream
  await updateRootRouting(kibanaServer, log, count);

  log.info(`Finished creating ${count} wired child streams via batched content import`);
}

/**
 * Create a large wired stream hierarchy under the root wired stream.
 *
 * @param strategy - 'fork' for serial fork (Phase 5A, safe for ~100 children)
 *                   'import' for content pack bulk import (Phase 5B, scales to 1000+)
 * @param count - Number of child streams to create
 */
export async function createLargeWiredHierarchy(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog,
  options: { count?: number; strategy?: WiredHierarchyStrategy } = {}
) {
  const { count = DEFAULT_WIRED_HIERARCHY_COUNT, strategy = 'import' } = options;

  // Raise max shards per node to accommodate all wired streams + system indices
  const maxShardsPerNode = count * 4;
  await es.cluster.putSettings({
    persistent: { 'cluster.max_shards_per_node': String(maxShardsPerNode) },
  });
  log.info(`Raised cluster.max_shards_per_node to ${maxShardsPerNode}`);

  if (strategy === 'fork') {
    await createLargeWiredHierarchyViaFork(kibanaServer, log, count);
  } else {
    await createLargeWiredHierarchyViaImport(kibanaServer, log, count);
  }
}

/**
 * Full setup for the large wired hierarchy journey.
 * In performance runs, guards heavy creation to run only during the ingest
 * phase (WARMUP), since beforeSteps runs in both WARMUP and TEST phases.
 * In regular FTR/CI runs (no performance phase), setup runs normally.
 */
export async function setupLargeWiredHierarchy(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog,
  options: { count?: number; strategy?: WiredHierarchyStrategy } = {}
) {
  const isPerformanceRun = Boolean(process.env.TEST_PERFORMANCE_PHASE);
  const shouldIngest = process.env.TEST_INGEST_ES_DATA === 'true';

  // beforeSteps runs in both WARMUP and TEST phases during performance runs.
  // Only skip in the TEST phase there; run setup normally in non-performance CI/FTR runs.
  if (isPerformanceRun && !shouldIngest) {
    log.info(
      'Skipping large wired hierarchy setup during performance TEST phase (TEST_INGEST_ES_DATA != true)'
    );
    return;
  }

  await enableStreams(kibanaServer, log);
  await createLargeWiredHierarchy(kibanaServer, es, log, options);
}
