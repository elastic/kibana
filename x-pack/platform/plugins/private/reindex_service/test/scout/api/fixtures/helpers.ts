/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import type { ApiClientFixture, ScoutTestConfig, ScoutWorkerFixtures } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test-es-server';
import { ReindexStatus, REINDEX_OP_TYPE } from '@kbn/upgrade-assistant-pkg-common';
import { ReindexStep } from '../../../../common';
import type { ReindexOperation } from '../../../../common';
import { API_BASE_PATH, SOURCE_INDEX } from './constants';

type EsClient = ScoutWorkerFixtures['esClient'];

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';
const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
};

/**
 * ES client as `system_indices_superuser`, which (unlike Scout's default `elastic` `esClient`) can
 * write restricted system indices like `.kibana` — needed for the hidden reindex-operation saved
 * object, whose paused-op setup has no HTTP API. Stateful only.
 */
export const createSystemIndicesEsClient = async (
  esClient: EsClient,
  config: ScoutTestConfig
): Promise<EsClient> => {
  // Tagged stateful-only; fail loudly if ever mis-tagged onto serverless rather than
  // silently skipping the role/user provisioning below.
  if (config.serverless) {
    throw new Error('Reindex service API tests are stateful-only and cannot run on serverless');
  }

  await esClient.security.putRole({
    name: SYSTEM_INDICES_SUPERUSER_ROLE,
    refresh: 'wait_for',
    cluster: ['all'],
    indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
    applications: [{ application: '*', privileges: ['*'], resources: ['*'] }],
    run_as: ['*'],
  });

  await esClient.security.putUser({
    username: systemIndicesSuperuser.username,
    refresh: 'wait_for',
    password: systemIndicesSuperuser.password,
    roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
  });

  return createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: systemIndicesSuperuser,
    isCloud: config.isCloud,
  });
};

// Three-document `dummydata` index, previously provided by the
// `es_archives/upgrade_assistant/reindex` archive. Two docs have `https: true`,
// which the filtered-alias test relies on.
const DUMMY_DOCS = [
  {
    '@timestamp': '2018-10-30T18:51:56.792Z',
    host: {
      architecture: 'x86_64',
      name: 'foo.home',
      os: { build: '18A391', family: 'darwin', platform: 'darwin', version: '10.14' },
    },
    https: true,
    response_ms: 114,
    versions: ['1.0.0', '8.8.4'],
  },
  {
    '@timestamp': '2018-12-30T18:51:56.792Z',
    host: {
      architecture: 'x86_64',
      name: 'bar.home',
      os: { build: '18AXX', family: 'darwin', platform: 'darwin', version: '10.12' },
    },
    https: false,
    response_ms: 1567,
    versions: ['0.4'],
  },
  {
    '@timestamp': '2018-01-30T18:51:56.792Z',
    host: {
      architecture: 'x86_64',
      name: 'qux.home',
      os: { build: 'YYY', family: 'linux', platform: 'linux', version: '3.24' },
    },
    https: true,
    response_ms: 94,
    versions: [],
  },
];

/**
 * (Re)create the `dummydata` source index with a known set of documents. Replaces the
 * archive `esArchiver.load` the FTR suite used before each test.
 */
export const loadDummydata = async (esClient: EsClient) => {
  await cleanupIndices(esClient, [SOURCE_INDEX]);
  await esClient.bulk({
    index: SOURCE_INDEX,
    refresh: 'wait_for',
    operations: DUMMY_DOCS.flatMap((doc) => [{ index: {} }, doc]),
  });
};

/**
 * Delete the concrete indices matching the given names/patterns. Resolves patterns to
 * concrete indices first (skipping aliases) so teardown works whether or not a `deleteOldIndex`
 * reindex has turned `dummydata` into an alias — deleting a backing index also removes its
 * aliases, while a direct delete of an alias name would error.
 */
export const cleanupIndices = async (esClient: EsClient, patterns: string[]) => {
  const resolved = await esClient.indices.resolveIndex(
    { name: patterns.join(','), expand_wildcards: 'all' },
    { ignore: [404] }
  );

  const concrete = resolved?.indices?.map((index) => index.name) ?? [];
  if (concrete.length > 0) {
    await esClient.indices.delete({ index: concrete }, { ignore: [404] });
  }
};

/**
 * Delete every persisted reindex-operation saved object from `.kibana`. Mirrors the FTR
 * suite's `afterEach` so no operation leaks into the next test.
 */
export const cleanupReindexOperations = async (sysEsClient: EsClient) => {
  await sysEsClient.deleteByQuery({
    index: '.kibana',
    refresh: true,
    conflicts: 'proceed',
    // `type` is a keyword field, so match it exactly with a term query. (A `simple_query_string`
    // tokenizes the hyphenated type name and matches nothing, leaving operations behind, which
    // makes a later reindex of the same index conflict with 409.)
    query: {
      term: {
        type: REINDEX_OP_TYPE,
      },
    },
  });
};

/**
 * Poll the reindex status endpoint until the operation is no longer in progress and is
 * unlocked, then return the final operation state. Bounded by a deadline so a stuck
 * operation fails the test instead of hanging forever (the FTR helper used `while (true)`).
 */
export const waitForReindexToComplete = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  indexName: string,
  { timeoutMs = 120_000, intervalMs = 1_000 }: { timeoutMs?: number; intervalMs?: number } = {}
) => {
  const deadline = Date.now() + timeoutMs;
  let lastState;

  while (Date.now() < deadline) {
    const response = await apiClient.get(`${API_BASE_PATH}/${indexName}`, { headers });
    if (response.statusCode !== 200) {
      throw new Error(
        `Unexpected status ${response.statusCode} while polling reindex status for "${indexName}"`
      );
    }

    lastState = response.body.reindexOp;
    // `reindexOp` is undefined if the status is queried before the operation's saved object
    // exists yet; keep polling until it appears (or the deadline fires).
    if (lastState) {
      // Once the operation is completed or failed and unlocked, stop polling.
      if (lastState.status !== ReindexStatus.inProgress && lastState.locked === null) {
        return lastState;
      }
    }

    await delay(intervalMs);
  }

  throw new Error(`Reindex for "${indexName}" did not complete within ${timeoutMs}ms`);
};

/**
 * Persist a paused reindex operation directly as a saved object. There is no HTTP API to
 * create a paused operation, so the resume test seeds one the same way the FTR suite did.
 */
export const createPausedReindexOperation = async (
  sysEsClient: EsClient,
  { indexName, newIndexName }: Pick<ReindexOperation, 'indexName' | 'newIndexName'>
) => {
  const now = new Date().toISOString();
  const attributes: ReindexOperation = {
    indexName,
    newIndexName,
    status: ReindexStatus.paused,
    lastCompletedStep: ReindexStep.created,
    locked: null,
    reindexTaskId: null,
    reindexTaskPercComplete: null,
    errorMessage: null,
    runningReindexCount: null,
    reindexOptions: { deleteOldIndex: true },
  };

  await sysEsClient.index({
    index: '.kibana',
    id: `${REINDEX_OP_TYPE}:${indexName}`,
    refresh: 'wait_for',
    document: {
      [REINDEX_OP_TYPE]: attributes,
      type: REINDEX_OP_TYPE,
      references: [],
      updated_at: now,
      created_at: now,
    },
  });
};
