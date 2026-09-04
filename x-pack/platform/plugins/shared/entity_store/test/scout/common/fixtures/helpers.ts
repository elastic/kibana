/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import type { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EntityStoreStatusResponseBody } from '../../../../server/routes/apis/status';
import { hashEuid } from '../../../../common/domain/euid';
import type { EntityType } from '../../../../common';
import { BASE_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';

import {
  ENTITY_STORE_ROUTES,
  HISTORY_INDEX_PATTERN,
  LATEST_ALIAS,
  LATEST_INDEX,
  UPDATES_INDEX,
  ENTRA_SOURCE_INDEX,
} from './constants';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];
export type ApiClientFixture = ApiWorkerFixtures['apiClient'];
type ApiClientResponse = Awaited<ReturnType<ApiClientFixture['get']>>; // ApiClientResponse is the same for all methods
/**
 * Normalizes values that may be stored as a single keyword or as keyword[] after
 * log extraction (e.g. `entity.relationships.*` bags).
 */
export const normalizeKeywordList = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
};

/** Logs-compatible data stream used by extraction tests to seed source log events. */
export const LOGS_TEST_INDEX = 'logs-entity-store-tests-default';

/** Non-logs data stream used by query translation tests. Avoids logs-* template quirks (null stripping, constant_keyword). */
export const QUERY_TRANSLATION_TEST_INDEX = 'entity-store-tests-default';

/**
 * Deletes all Entity Store data indices: latest, updates, history snapshots, and
 * the test-only logs source data stream populated by ingestDoc / esArchiver (logs archive).
 * Call in afterAll / afterEach to prevent stale data from leaking between
 * sequential test-target runs that share the same ES cluster.
 */
export const clearEntityStoreIndices = async (esClient: EsClient) => {
  const resolved = await esClient.indices.resolveIndex({ name: HISTORY_INDEX_PATTERN });
  const historyIndices = resolved.indices.map((i) => i.name);

  // Delete regular indices (latest, updates, history snapshots)
  const toDelete = [LATEST_INDEX, UPDATES_INDEX, ...historyIndices];
  await esClient.indices.delete({ index: toDelete, ignore_unavailable: true }, { ignore: [404] });

  await esClient.indices.deleteDataStream({ name: LOGS_TEST_INDEX }).catch(() => {});
  await esClient.indices.deleteDataStream({ name: QUERY_TRANSLATION_TEST_INDEX }).catch(() => {});
};

/**
 * API client shape required by forceUserExtraction.
 * Use this instead of importing Scout's ApiClient type.
 */
export interface ForceLogExtractionApiClient {
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: unknown }>;
}

export const ingestDoc = async (
  esClient: EsClient,
  body: Record<string, unknown>,
  index = LOGS_TEST_INDEX
) =>
  esClient.index({
    index,
    refresh: 'wait_for',
    body,
  });

/**
 * Creates an index template that overrides data_stream.dataset from constant_keyword
 * to keyword for the test data stream, then resets it so the new mapping applies.
 * Must be called before esArchiver.loadIfNeeded for the logs test archive.
 *
 * The standard `logs` component template locks data_stream.dataset as constant_keyword
 * (one value per backing index). Our test archive has multiple dataset values, so we
 * override the mapping before the data stream is created.
 */
export const setupLogsTestDataStream = async (esClient: EsClient) => {
  await esClient.indices.putIndexTemplate({
    name: 'entity-store-test-logs-override',
    index_patterns: ['logs-entity-store-tests-*'],
    data_stream: {},
    // Compose the same component templates as the built-in `logs` template so ECS field
    // mappings (e.g. entity.id as keyword) are preserved. Our own template.mappings entry
    // for data_stream.dataset overrides the constant_keyword from ecs@mappings, which
    // is what allows us to index documents with different dataset values in one backing index.
    composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
    template: {
      mappings: {
        properties: {
          data_stream: { properties: { dataset: { type: 'keyword' } } },
        },
      },
    },
    priority: 500,
  });
  await esClient.indices.deleteDataStream({ name: LOGS_TEST_INDEX }).catch(() => {});
};

export const teardownLogsTestDataStream = async (esClient: EsClient) => {
  await esClient.indices
    .deleteIndexTemplate({ name: 'entity-store-test-logs-override' })
    .catch(() => {});
};

/** Sets up a plain (non-logs-*) data stream for query translation tests with ECS field mappings. */
export const setupQueryTranslationTestDataStream = async (esClient: EsClient) => {
  await esClient.indices.putIndexTemplate({
    name: 'entity-store-query-translation-test',
    index_patterns: ['entity-store-tests-*'],
    data_stream: {},
    composed_of: ['ecs@mappings'],
    priority: 500,
  });
  await esClient.indices.deleteDataStream({ name: QUERY_TRANSLATION_TEST_INDEX }).catch(() => {});
};

export const teardownQueryTranslationTestDataStream = async (esClient: EsClient) => {
  await esClient.indices
    .deleteIndexTemplate({ name: 'entity-store-query-translation-test' })
    .catch(() => {});
};

export const searchDocById = async (esClient: EsClient, id: string) => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  return await esClient.search({
    index: LATEST_ALIAS,
    version: true,
    query: {
      bool: {
        filter: {
          term: { 'entity.id': id },
        },
      },
    },
    size: 2,
  });
};

interface SeedUserEntityOptions {
  entityId: string;
  namespace: string;
  email: string | string[];
  userName?: string;
  timestamp?: string;
}

/**
 * Seeds a user entity directly into the LATEST index with nested document
 * structure. Uses `pipeline: '_none'` to bypass the index's default ingest
 * pipeline (which may not exist in test environments).
 *
 * Uses esClient.index() instead of the CRUD API because the CRUD API nests
 * `entity` under `user.entity`, breaking automated resolution queries that
 * expect `entity.id` at the document root.
 */
export const seedUserEntity = async (
  esClient: EsClient,
  { entityId, namespace, email, userName, timestamp }: SeedUserEntityOptions
) => {
  const ts = timestamp ?? new Date().toISOString();
  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(entityId),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      entity: {
        id: entityId,
        name: entityId,
        EngineMetadata: { Type: 'user' },
        namespace,
        lifecycle: {
          first_seen: ts,
          last_seen: ts,
        },
      },
      user: {
        email,
        name: userName ?? entityId,
      },
      '@timestamp': ts,
    },
  });
};

interface SeedEntityAnalyticsSourceOptions {
  email: string;
  relatedUsers: string[];
  timestamp?: string;
}

export const seedEntityAnalyticsSource = async (
  esClient: EsClient,
  { email, relatedUsers, timestamp }: SeedEntityAnalyticsSourceOptions
) => {
  const ts = timestamp ?? new Date().toISOString();
  await esClient.index({
    index: ENTRA_SOURCE_INDEX,
    refresh: 'wait_for',
    body: {
      '@timestamp': ts,
      event: {
        kind: 'asset',
        module: 'entityanalytics_entra_id',
      },
      user: {
        email,
        name: email,
      },
      related: {
        user: relatedUsers,
      },
    },
  });
};

const RESOLVED_TO_PATH = 'entity.relationships.resolution.resolved_to';

const readResolvedTo = (source: Record<string, unknown>): unknown =>
  // Check both nested path and flat dotted key (ES update stores as flat key)
  getNestedValue(source, RESOLVED_TO_PATH) ?? source[RESOLVED_TO_PATH];

const fetchEntitySource = async (
  esClient: EsClient,
  entityId: string
): Promise<Record<string, unknown> | undefined> => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  const response = await esClient.search({
    index: LATEST_ALIAS,
    query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
    size: 1,
  });

  return response.hits.hits[0]?._source as Record<string, unknown> | undefined;
};

/**
 * Polls the LATEST index until an entity's `resolved_to` field matches the
 * expected target, or until timeout. Returns the matching `_source`.
 */
export const waitForResolution = async (
  esClient: EsClient,
  entityId: string,
  expectedTarget: string,
  timeoutMs = 30_000
): Promise<Record<string, unknown>> => {
  let matchedSource: Record<string, unknown> | undefined;

  await expect
    .poll(
      async () => {
        const source = await fetchEntitySource(esClient, entityId);
        if (!source) {
          return undefined;
        }

        const resolvedTo = readResolvedTo(source);
        if (resolvedTo === expectedTarget) {
          matchedSource = source;
        }

        return resolvedTo;
      },
      {
        timeout: timeoutMs,
        intervals: [200],
        message: `Timed out waiting for entity '${entityId}' to resolve to '${expectedTarget}'`,
      }
    )
    .toBe(expectedTarget);

  if (!matchedSource) {
    throw new Error(
      `Resolved entity '${entityId}' to '${expectedTarget}' but could not read its _source`
    );
  }

  return matchedSource;
};

/**
 * Polls the LATEST index and asserts that an entity does NOT gain a
 * `resolved_to` value within the given timeout (shorter default for negative tests).
 */
export const assertNotResolved = async (
  esClient: EsClient,
  entityId: string,
  timeoutMs = 10_000
): Promise<void> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const source = await fetchEntitySource(esClient, entityId);
    if (source) {
      const resolvedTo = readResolvedTo(source);
      if (resolvedTo != null) {
        throw new Error(
          `Entity '${entityId}' unexpectedly resolved to '${resolvedTo}' — expected it to stay unresolved`
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

/**
 * Triggers a maintainer run by calling the async `run/{id}` endpoint.
 * The route calls `taskManager.runSoon()` — it does NOT wait for completion.
 *
 * Retries on 500 errors, which happen when the scheduler fires an automatic
 * run that overlaps with the manual trigger. Kibana wraps the actual
 * "currently running" error in a generic 500 body, so we retry on any 500.
 */
export const triggerMaintainerRun = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  maintainerId = 'automated-resolution',
  { maxRetries = 5, retryDelayMs = 2000, sync = false } = {}
) => {
  // Use `sync: true` in tests that need a settled watermark before proceeding.
  const runUrl = `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN(
    maintainerId
  )}?sync=${sync}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await apiClient.post(runUrl, {
      headers,
      responseType: 'json',
      body: {},
    });

    if (response.statusCode === 200) {
      return response;
    }

    const body = JSON.stringify(response.body);

    if (response.statusCode === 500 && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      continue;
    }

    throw new Error(`Failed to trigger maintainer run '${maintainerId}': ${body}`);
  }
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export const forceLogExtraction = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  entityType: EntityType,
  fromDateISO: string,
  toDateISO: string
) =>
  await apiClient.post(ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION(entityType), {
    headers,
    responseType: 'json',
    body: { fromDateISO, toDateISO },
  });

export const installAllEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
) =>
  // Explicitly pass the 11 base entity types so that tests are not affected by the
  // synthetic performance-test definitions (perf.entity.NNN) added to the registry.
  apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
    headers,
    responseType: 'json',
    body: { entityTypes: [...BASE_ENTITY_TYPES] },
  });

export const uninstallAllEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
) =>
  apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
    headers,
    responseType: 'json',
    body: {},
  });

export const getStatus = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  { includeComponents = false } = {}
): Promise<Omit<ApiClientResponse, 'body'> & { body: EntityStoreStatusResponseBody }> =>
  apiClient.get(
    includeComponents
      ? `${ENTITY_STORE_ROUTES.public.STATUS}?include_components=true`
      : ENTITY_STORE_ROUTES.public.STATUS,
    {
      headers,
      responseType: 'json',
    }
  );

export const startEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  entityTypes: EntityType[]
) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.START, {
    headers,
    responseType: 'json',
    body: { entityTypes },
  });

export const stopEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  entityTypes: EntityType[]
) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.STOP, {
    headers,
    responseType: 'json',
    body: { entityTypes },
  });

export const startAllEntityTypes = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.START, {
    headers,
    responseType: 'json',
    body: {},
  });

export const stopAllEntityTypes = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.STOP, {
    headers,
    responseType: 'json',
    body: {},
  });
