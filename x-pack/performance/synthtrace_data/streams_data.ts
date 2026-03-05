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

/** Root wired stream to fork children from (guaranteed after enablement). */
const WIRED_ROOT_STREAM = 'logs.otel';

const INTERNAL_API_HEADERS = {
  'kbn-xsrf': 'streams-perf-test',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

/** Batch size for classic stream creation — serialized because the Streams
 *  backend uses a global lock, making concurrent requests counterproductive. */
const CLASSIC_STREAM_BATCH_SIZE = 1;

/** Max retries for transient errors (lock contention) */
const MAX_RETRIES = 5;

/** Base delay between retries in ms */
const RETRY_BASE_DELAY_MS = 3000;

function isEsTimeoutError(error: unknown): boolean {
  const err = error as { name?: string; message?: string };
  return err?.name === 'TimeoutError' || /request timed out/i.test(err?.message ?? '');
}

function isConflictError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 409;
}

/** 409 for "already exists" (content import may have succeeded before timing out). */
function isAlreadyExistsConflict(error: unknown): boolean {
  const err = error as { response?: { status?: number; data?: { message?: string } } };
  return err?.response?.status === 409 && /already exists/i.test(err.response.data?.message ?? '');
}

function isLockContentionError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 422;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Enable wired streams (idempotent). */
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

/** Create a classic stream (ignore 409, retry 422). */
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
        return;
      }
      if (isLockContentionError(error) && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

/** Create classic streams serially to reduce lock contention. */
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
    for (const name of batch) {
      await createSingleClassicStream(kibanaServer, name);
      created += 1;
    }

    if (created % 500 === 0 || created === count) {
      log.info(`  Created ${created}/${count} classic streams`);
    }

    if (i + CLASSIC_STREAM_BATCH_SIZE < names.length) {
      await sleep(1500);
    }
  }

  log.info(`Finished creating ${count} classic streams`);
}

/**
 * Create many unmanaged data streams via ES bulk indexing.
 * Kibana discovers these as unmanaged classic streams.
 */
export async function createBulkDataStreams(
  es: Client,
  log: ToolingLog,
  count: number,
  prefix: string = 'logs-perf-classic'
) {
  log.info(`Creating ${count} unmanaged data streams with prefix '${prefix}' via ES bulk API...`);

  // Headroom for failure stores and system indices.
  const maxShardsPerNode = count * 4;
  await es.cluster.putSettings({
    persistent: { 'cluster.max_shards_per_node': String(maxShardsPerNode) },
  });
  log.info(`  Raised cluster.max_shards_per_node to ${maxShardsPerNode}`);

  await es.indices.putIndexTemplate({
    name: 'perf-classic-streams-template',
    index_patterns: [`${prefix}-*`],
    data_stream: {},
    template: {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    },
  });
  log.info('  Index template created');

  // Keep batch size moderate. Each auto-created stream triggers cluster state work.
  const BULK_BATCH_SIZE = 100;
  const BULK_REQUEST_TIMEOUT_MS = 300_000;
  const names = Array.from({ length: count }, (_, i) => `${prefix}-${String(i).padStart(5, '0')}`);
  const timestamp = new Date().toISOString();

  let created = 0;
  for (let i = 0; i < names.length; i += BULK_BATCH_SIZE) {
    const batch = names.slice(i, i + BULK_BATCH_SIZE);
    const operations = batch.flatMap((name) => [
      { create: { _index: name } },
      { '@timestamp': timestamp, message: 'init' },
    ]);

    let bulkResult: Awaited<ReturnType<Client['bulk']>> | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        bulkResult = await es.bulk(
          { operations, refresh: false },
          { requestTimeout: BULK_REQUEST_TIMEOUT_MS }
        );
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (isEsTimeoutError(error) && attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * attempt;
          log.warning(
            `  Bulk batch offset ${i}: timed out on attempt ${attempt}/${MAX_RETRIES}, retrying in ${delay}ms`
          );
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    if (!bulkResult) throw lastError ?? new Error(`Bulk batch offset ${i} failed`);

    if (bulkResult.errors) {
      const firstFailure = bulkResult.items.find((item) => (item.create?.status ?? 201) !== 201);
      throw new Error(
        `Bulk data stream creation failed at offset ${i}. ` +
          `First error: ${JSON.stringify(firstFailure?.create?.error)}`
      );
    }
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
    if (!isConflictError(error)) {
      throw error;
    }
  }
}

/** Create a small wired hierarchy under `logs.otel`. */
export async function createWiredStreamHierarchy(kibanaServer: KibanaServer, log: ToolingLog) {
  log.info('Creating wired stream hierarchy...');

  const children = [
    { name: `${WIRED_ROOT_STREAM}.child1`, conditionValue: 'service-1' },
    { name: `${WIRED_ROOT_STREAM}.child2`, conditionValue: 'service-2' },
    { name: `${WIRED_ROOT_STREAM}.child3`, conditionValue: 'service-3' },
  ];

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

/** Setup for the streams listing page journey. */
export async function setupListingPageData(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog
) {
  if (!shouldRunSetup(log)) return;

  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  await createBulkDataStreams(es, log, 5000);
  await createClassicStreams(kibanaServer, log, 20);
}

export async function setupWiredStreams(kibanaServer: KibanaServer, log: ToolingLog) {
  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);
}

type WiredHierarchyStrategy = 'fork' | 'import';

const DEFAULT_WIRED_HIERARCHY_COUNT = 100;

/** Create many wired children by serial fork (lock-heavy). */
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
 * Build content pack entries for a batch.
 * Routing can only reference children present in the same batch.
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

/** Upload a content pack archive (multipart/form-data). */
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

/** Update root routing after batched imports. */
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

  // Root streams cannot use `inherit` for lifecycle/failure_store.
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
      if ((isConflictError(err) || isLockContentionError(err)) && attempt < MAX_RETRIES) {
        const code = isLockContentionError(err) ? 422 : 409;
        const delay = RETRY_BASE_DELAY_MS * attempt;
        log.warning(
          `Root routing update: ${code} on attempt ${attempt}, retrying in ${delay}ms...`
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
 * Create many wired children via batched content imports.
 * One huge import can OOM. Batch to keep memory bounded.
 */
async function createLargeWiredHierarchyViaImport(
  kibanaServer: KibanaServer,
  log: ToolingLog,
  count: number
) {
  const IMPORT_BATCH_SIZE = 50;
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
        if (isAlreadyExistsConflict(err)) {
          // A previous attempt (that timed out or errored) already created these
          // streams. Retrying will never succeed, so treat the batch as done.
          log.warning(
            `  Batch ${batchIndex + 1}/${totalBatches}: streams already exist ` +
              `(prior attempt likely succeeded before timeout), continuing`
          );
          lastError = undefined;
          break;
        }
        if ((isConflictError(err) || isLockContentionError(err)) && attempt < MAX_RETRIES) {
          const code = isLockContentionError(err) ? 422 : 409;
          const delay = RETRY_BASE_DELAY_MS * attempt;
          log.warning(
            `  Batch ${
              batchIndex + 1
            }/${totalBatches}: ${code} on attempt ${attempt}, retrying in ${delay}ms...`
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

/** Setup for the large wired hierarchy journey. */
export async function setupLargeWiredHierarchy(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog,
  options: { count?: number; strategy?: WiredHierarchyStrategy } = {}
) {
  const isPerformanceRun = Boolean(process.env.TEST_PERFORMANCE_PHASE);
  const shouldIngest = process.env.TEST_INGEST_ES_DATA === 'true';

  // beforeSteps runs in both WARMUP and TEST phases during performance runs.
  if (isPerformanceRun && !shouldIngest) {
    log.info(
      'Skipping large wired hierarchy setup during performance TEST phase (TEST_INGEST_ES_DATA != true)'
    );
    return;
  }

  await enableStreams(kibanaServer, log);
  await createLargeWiredHierarchy(kibanaServer, es, log, options);
}

const CHILD_STREAM = `${WIRED_ROOT_STREAM}.child1`;

/** Skip heavy setup during performance TEST phase. */
function shouldRunSetup(log: ToolingLog): boolean {
  const isPerformanceRun = Boolean(process.env.TEST_PERFORMANCE_PHASE);
  const shouldIngest = process.env.TEST_INGEST_ES_DATA === 'true';
  if (isPerformanceRun && !shouldIngest) {
    log.info('Skipping at-scale setup during performance TEST phase');
    return false;
  }
  return true;
}

interface IngestConfig {
  processing: { steps: unknown[] };
  settings: Record<string, unknown>;
  wired: { fields: Record<string, unknown>; routing: unknown[] };
  lifecycle: Record<string, unknown>;
  failure_store: Record<string, unknown>;
}

/** GET ingest, mutate, PUT back (strip read-only processing.updated_at). */
async function getAndUpdateIngestConfig(
  kibanaServer: KibanaServer,
  streamName: string,
  mutate: (config: IngestConfig) => void
) {
  const response = await kibanaServer.request<{
    ingest: IngestConfig & { processing: { updated_at?: string } };
  }>({
    path: `/api/streams/${streamName}/_ingest`,
    method: 'GET',
    headers: PUBLIC_API_HEADERS,
  });

  const config = response.data.ingest;
  const { updated_at: _updatedAt, ...processingWithoutTimestamp } = config.processing;
  config.processing = processingWithoutTimestamp as IngestConfig['processing'];

  mutate(config);

  await kibanaServer.request({
    path: `/api/streams/${streamName}/_ingest`,
    method: 'PUT',
    headers: PUBLIC_API_HEADERS,
    body: { ingest: config },
  });
}

/** Setup for the processing journey at scale. */
export async function setupProcessingAtScale(kibanaServer: KibanaServer, log: ToolingLog) {
  if (!shouldRunSetup(log)) return;

  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  const PROCESSOR_COUNT = 30;
  log.info(`Adding ${PROCESSOR_COUNT} grok processors to ${CHILD_STREAM}...`);

  await getAndUpdateIngestConfig(kibanaServer, CHILD_STREAM, (config) => {
    const processors = Array.from({ length: PROCESSOR_COUNT }, (_, i) => ({
      action: 'grok' as const,
      from: 'body.text',
      patterns: [`%{WORD:attributes.perf_proc_${String(i + 1).padStart(3, '0')}}`],
      pattern_definitions: {},
      ignore_missing: true,
      ignore_failure: true,
    }));
    config.processing.steps = processors;
  });

  log.info(`${PROCESSOR_COUNT} grok processors added to ${CHILD_STREAM}`);
}

/** Setup for the data quality journey at scale. */
export async function setupDataQualityAtScale(
  kibanaServer: KibanaServer,
  es: Client,
  log: ToolingLog
) {
  if (!shouldRunSetup(log)) return;

  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  const FIELD_COUNT = 50;
  const DOC_COUNT = 5000;
  const LONG_VALUE = 'x'.repeat(1025);

  log.info(`Mapping ${FIELD_COUNT} keyword fields on ${CHILD_STREAM}...`);

  const fields: Record<string, { type: string }> = {};
  for (let i = 1; i <= FIELD_COUNT; i++) {
    fields[`attributes.perf_dq_${String(i).padStart(3, '0')}`] = { type: 'keyword' };
  }

  await getAndUpdateIngestConfig(kibanaServer, CHILD_STREAM, (config) => {
    config.wired.fields = { ...config.wired.fields, ...fields };
  });

  log.info(`Mapped ${FIELD_COUNT} keyword fields. Bulk-indexing ${DOC_COUNT} degraded docs...`);

  const BULK_BATCH_SIZE = 500;
  let indexed = 0;
  for (let i = 0; i < DOC_COUNT; i += BULK_BATCH_SIZE) {
    const batchSize = Math.min(BULK_BATCH_SIZE, DOC_COUNT - i);
    const operations = [];
    for (let j = 0; j < batchSize; j++) {
      const doc: Record<string, string> = {
        '@timestamp': new Date().toISOString(),
        message: `degraded-doc-${i + j}`,
      };
      for (let f = 1; f <= FIELD_COUNT; f++) {
        doc[`attributes.perf_dq_${String(f).padStart(3, '0')}`] = LONG_VALUE;
      }
      operations.push({ create: { _index: CHILD_STREAM } }, doc);
    }

    const bulkResult = await es.bulk({ operations, refresh: false });
    if (bulkResult.errors) {
      const firstFailure = bulkResult.items.find((item) => (item.create?.status ?? 201) !== 201);
      throw new Error(
        `Bulk degraded doc indexing failed at offset ${i}. ` +
          `First error: ${JSON.stringify(firstFailure?.create?.error)}`
      );
    }
    indexed += batchSize;
    if (indexed % 1000 === 0 || indexed === DOC_COUNT) {
      log.info(`  Indexed ${indexed}/${DOC_COUNT} degraded docs`);
    }
  }

  await es.indices.refresh({ index: CHILD_STREAM });
  log.info(`${DOC_COUNT} degraded docs indexed into ${CHILD_STREAM}`);
}

/** Setup for the field mapping journey at scale. */
export async function setupFieldMappingAtScale(kibanaServer: KibanaServer, log: ToolingLog) {
  if (!shouldRunSetup(log)) return;

  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  const FIELD_COUNT = 200;
  const FIELD_TYPES = ['keyword', 'long', 'double', 'boolean', 'ip', 'date'];

  log.info(`Mapping ${FIELD_COUNT} fields on ${CHILD_STREAM}...`);

  const fields: Record<string, { type: string }> = {};
  for (let i = 1; i <= FIELD_COUNT; i++) {
    const type = FIELD_TYPES[(i - 1) % FIELD_TYPES.length];
    fields[`attributes.perf_schema_${String(i).padStart(3, '0')}`] = { type };
  }

  await getAndUpdateIngestConfig(kibanaServer, CHILD_STREAM, (config) => {
    config.wired.fields = { ...config.wired.fields, ...fields };
  });

  log.info(`${FIELD_COUNT} fields mapped on ${CHILD_STREAM}`);
}

/** Setup for the retention journey at scale. */
export async function setupRetentionAtScale(kibanaServer: KibanaServer, log: ToolingLog) {
  if (!shouldRunSetup(log)) return;

  await enableStreams(kibanaServer, log);
  await createWiredStreamHierarchy(kibanaServer, log);

  log.info(`Setting lifecycle with 10 downsampling steps on ${CHILD_STREAM}...`);

  const downsampleSteps = [
    { after: '0d', fixed_interval: '1h' },
    { after: '1d', fixed_interval: '2h' },
    { after: '3d', fixed_interval: '4h' },
    { after: '7d', fixed_interval: '8h' },
    { after: '14d', fixed_interval: '1d' },
    { after: '30d', fixed_interval: '2d' },
    { after: '60d', fixed_interval: '4d' },
    { after: '90d', fixed_interval: '8d' },
    { after: '180d', fixed_interval: '16d' },
    { after: '365d', fixed_interval: '32d' },
  ];

  await getAndUpdateIngestConfig(kibanaServer, CHILD_STREAM, (config) => {
    config.lifecycle = {
      dsl: {
        data_retention: '30d',
        downsample: downsampleSteps,
      },
    };
  });

  log.info(`Lifecycle with 10 downsampling steps set on ${CHILD_STREAM}`);
}
