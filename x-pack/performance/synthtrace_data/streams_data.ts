/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KibanaServer } from '@kbn/ftr-common-functional-services';
import type { ToolingLog } from '@kbn/tooling-log';

const PUBLIC_API_HEADERS = {
  'kbn-xsrf': 'streams-perf-test',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

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
 */
export async function createBulkDataStreams(
  es: Client,
  log: ToolingLog,
  count: number,
  prefix: string = 'logs-perf-classic'
) {
  log.info(`Creating ${count} unmanaged data streams with prefix '${prefix}' via ES API...`);

  // 1. Create an index template matching the naming pattern
  await es.indices.putIndexTemplate({
    name: 'perf-classic-streams-template',
    index_patterns: [`${prefix}-*`],
    data_stream: {},
    template: {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
    },
  });
  log.info('  Index template created');

  // 2. Create data streams in parallel batches
  const BATCH_SIZE = 50;
  const names = Array.from({ length: count }, (_, i) => `${prefix}-${String(i).padStart(5, '0')}`);

  let created = 0;
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((name) =>
        es.indices.createDataStream({ name }).catch((error) => {
          // Ignore 'resource_already_exists_exception' for idempotency
          if (
            error?.meta?.body?.error?.type === 'resource_already_exists_exception' ||
            error?.meta?.statusCode === 400
          ) {
            return;
          }
          throw error;
        })
      )
    );
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
 * Create a wired stream hierarchy: the root 'logs' stream with child streams forked from it.
 * Requires wired streams to be enabled first (call enableStreams).
 *
 * Creates:
 *   logs
 *   ├── logs.child1  (routes on resource.attributes.service.name == 'service-1')
 *   ├── logs.child2  (routes on resource.attributes.service.name == 'service-2')
 *   └── logs.child3  (routes on resource.attributes.service.name == 'service-3')
 */
export async function createWiredStreamHierarchy(kibanaServer: KibanaServer, log: ToolingLog) {
  log.info('Creating wired stream hierarchy...');

  const children = [
    { name: 'logs.child1', conditionValue: 'service-1' },
    { name: 'logs.child2', conditionValue: 'service-2' },
    { name: 'logs.child3', conditionValue: 'service-3' },
  ];

  // Fork children sequentially — each fork modifies the parent's routing
  for (const child of children) {
    log.info(`  Forking ${child.name} from logs...`);
    await forkStream(
      kibanaServer,
      'logs',
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
