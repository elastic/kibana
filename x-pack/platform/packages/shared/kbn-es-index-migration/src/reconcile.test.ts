/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { defineMigration } from './define_migration';
import { reconcile } from './reconcile';
import { VERSION_META_KEY } from './backends/index_backend';

const INDEX = '.test-entities-default';

const v2Mappings = { properties: { name: { type: 'keyword' as const } } };
const v3Mappings = {
  properties: { name: { type: 'keyword' as const }, level: { type: 'keyword' as const } },
};

const createLogger = (): Logger =>
  ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as Logger);

/** Minimal in-memory stand-in for the indices API the backend uses. */
const createEsClient = (initial?: { version?: number }) => {
  const state: { exists: boolean; meta: Record<string, unknown> } = {
    exists: initial !== undefined,
    meta: initial?.version === undefined ? {} : { [VERSION_META_KEY]: initial.version },
  };

  const putMapping = jest.fn(async ({ _meta }: { _meta?: Record<string, unknown> }) => {
    if (_meta) state.meta = _meta;
    return { acknowledged: true };
  });

  const esClient = {
    indices: {
      exists: jest.fn(async () => state.exists),
      getMapping: jest.fn(async () => ({ [INDEX]: { mappings: { _meta: state.meta } } })),
      putMapping,
      create: jest.fn(async ({ mappings }: { mappings?: { _meta?: Record<string, unknown> } }) => {
        state.exists = true;
        state.meta = mappings?._meta ?? {};
        return { acknowledged: true };
      }),
    },
  } as unknown as ElasticsearchClient;

  return { esClient, state, putMapping };
};

const definition = defineMigration({
  id: 'test-migration',
  resource: { kind: 'index', name: () => INDEX },
  baseline: 1,
  execution: 'manual',
  versions: {
    2: { change: 'additive', mappings: v2Mappings },
    3: { change: 'additive', mappings: v3Mappings },
  },
});

const run = (esClient: ElasticsearchClient) =>
  reconcile({ definition, esClient, logger: createLogger(), namespace: 'default' });

describe('reconcile', () => {
  it('creates the index at the target version when it does not exist', async () => {
    const { esClient, state } = createEsClient();

    const result = await run(esClient);

    expect(result.status).toBe('created');
    expect(result.installed).toBe(3);
    expect(state.meta[VERSION_META_KEY]).toBe(3);
  });

  it('applies every missing version in order', async () => {
    const { esClient, state } = createEsClient({ version: 1 });

    const result = await run(esClient);

    expect(result.status).toBe('migrated');
    expect(result.applied).toEqual([2, 3]);
    expect(state.meta[VERSION_META_KEY]).toBe(3);
  });

  it('applies only the versions above the installed one', async () => {
    const { esClient } = createEsClient({ version: 2 });

    const result = await run(esClient);

    expect(result.applied).toEqual([3]);
  });

  it('falls back to the baseline when the index carries no stamp', async () => {
    const { esClient } = createEsClient({});

    const result = await run(esClient);

    expect(result.installed).toBe(1);
    expect(result.applied).toEqual([2, 3]);
  });

  it('is a no-op when already at the target version', async () => {
    const { esClient, putMapping } = createEsClient({ version: 3 });

    const result = await run(esClient);

    expect(result.status).toBe('up_to_date');
    expect(result.applied).toEqual([]);
    expect(putMapping).not.toHaveBeenCalled();
  });

  it('re-running after a migration changes nothing', async () => {
    const { esClient } = createEsClient({ version: 1 });

    await run(esClient);
    const second = await run(esClient);

    expect(second.status).toBe('up_to_date');
    expect(second.applied).toEqual([]);
  });

  it('always sends the full _meta so the version survives a mappings write', async () => {
    const { esClient, putMapping } = createEsClient({ version: 1 });

    await run(esClient);

    // Elasticsearch replaces _meta wholesale rather than merging it.
    putMapping.mock.calls.forEach(([args]) => {
      expect(args._meta).toHaveProperty(VERSION_META_KEY);
    });
  });

  it('runs a data step and stamps it', async () => {
    const { esClient, state } = createEsClient({ version: 2 });
    const backfill = jest.fn(async () => {});

    const result = await reconcile({
      definition: defineMigration({
        ...definition,
        versions: {
          2: { change: 'additive', mappings: v2Mappings },
          3: { change: 'data', run: backfill },
        },
      }),
      esClient,
      logger: createLogger(),
      namespace: 'default',
    });

    expect(backfill).toHaveBeenCalledTimes(1);
    expect(result.applied).toEqual([3]);
    expect(state.meta[VERSION_META_KEY]).toBe(3);
  });

  it('stops at the last version that succeeded when a step throws', async () => {
    const { esClient, state } = createEsClient({ version: 1 });

    const result = await reconcile({
      definition: defineMigration({
        ...definition,
        versions: {
          2: { change: 'additive', mappings: v2Mappings },
          3: {
            change: 'data',
            run: async () => {
              throw new Error('backfill exploded');
            },
          },
        },
      }),
      esClient,
      logger: createLogger(),
      namespace: 'default',
    });

    expect(result.status).toBe('failed');
    expect(result.applied).toEqual([2]);
    expect(result.error).toContain('version 3');
    expect(state.meta[VERSION_META_KEY]).toBe(2);
  });

  it('resolves the resource name per namespace', async () => {
    const { esClient } = createEsClient({ version: 3 });

    const result = await reconcile({
      definition: defineMigration({
        ...definition,
        resource: { kind: 'index', name: (namespace) => `.entities-${namespace}` },
      }),
      esClient,
      logger: createLogger(),
      namespace: 'my-space',
    });

    expect(result.resourceName).toBe('.entities-my-space');
    expect(result.namespace).toBe('my-space');
  });
});

describe('defineMigration', () => {
  const valid = {
    id: 'x',
    resource: { kind: 'index' as const, name: () => INDEX },
    baseline: 1,
    execution: 'manual' as const,
    versions: { 2: { change: 'additive' as const, mappings: v2Mappings } },
  };

  it('rejects a gap in the version sequence', () => {
    expect(() =>
      defineMigration({
        ...valid,
        versions: {
          2: { change: 'additive', mappings: v2Mappings },
          4: { change: 'additive', mappings: v3Mappings },
        },
      })
    ).toThrow(/consecutive/);
  });

  it('rejects a non-positive baseline', () => {
    expect(() => defineMigration({ ...valid, baseline: 0 })).toThrow(/positive integer/);
  });

  it('rejects an empty id', () => {
    expect(() => defineMigration({ ...valid, id: '  ' })).toThrow(/non-empty/);
  });
});
