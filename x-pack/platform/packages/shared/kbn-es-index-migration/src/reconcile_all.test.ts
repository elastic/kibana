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
import { reconcileAll } from './reconcile_all';
import { VERSION_META_KEY } from './backends/index_backend';

const createLogger = (): Logger =>
  ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as Logger);

const definition = defineMigration({
  id: 'multi-space',
  resource: { kind: 'index', name: (namespace) => `.entities-${namespace}` },
  baseline: 1,
  execution: 'manual',
  versions: { 2: { change: 'additive', mappings: { properties: {} } } },
});

/** Per-index state, so each namespace behaves independently. */
const createEsClient = (failOn: string[] = []) => {
  const versions = new Map<string, number>();

  const esClient = {
    indices: {
      exists: jest.fn(async () => true),
      getMapping: jest.fn(async ({ index }: { index: string }) => ({
        [index]: { mappings: { _meta: { [VERSION_META_KEY]: versions.get(index) ?? 1 } } },
      })),
      putMapping: jest.fn(async ({ index }: { index: string }) => {
        if (failOn.includes(index)) {
          throw Object.assign(new Error('nope'), {
            meta: { body: { error: { type: 'illegal_argument_exception', reason: 'nope' } } },
          });
        }
        versions.set(index, 2);
        return { acknowledged: true };
      }),
      create: jest.fn(async () => ({ acknowledged: true })),
    },
  } as unknown as ElasticsearchClient;

  return { esClient, versions };
};

const run = (esClient: ElasticsearchClient, namespaces: string[], signal?: AbortSignal) =>
  reconcileAll({ definition, esClient, logger: createLogger(), namespaces, signal });

describe('reconcileAll', () => {
  it('reconciles every namespace', async () => {
    const { esClient, versions } = createEsClient();

    const results = await run(esClient, ['default', 'team-a', 'team-b']);

    expect(results.map(({ namespace }) => namespace)).toEqual(['default', 'team-a', 'team-b']);
    expect(results.every(({ status }) => status === 'migrated')).toBe(true);
    expect(versions.size).toBe(3);
  });

  it('keeps going when one namespace fails', async () => {
    const { esClient, versions } = createEsClient(['.entities-team-a']);

    const results = await run(esClient, ['default', 'team-a', 'team-b']);

    // A single bad index must not leave every other space un-migrated.
    expect(results.map(({ status }) => status)).toEqual(['migrated', 'failed', 'migrated']);
    expect(versions.has('.entities-default')).toBe(true);
    expect(versions.has('.entities-team-b')).toBe(true);
  });

  it('records which namespace failed and why', async () => {
    const { esClient } = createEsClient(['.entities-team-a']);

    const results = await run(esClient, ['default', 'team-a']);
    const failure = results.find(({ status }) => status === 'failed');

    expect(failure?.namespace).toBe('team-a');
    expect(failure?.error).toContain('nope');
  });

  it('stops when the signal aborts, returning what it finished', async () => {
    const { esClient } = createEsClient();
    const controller = new AbortController();
    controller.abort();

    const results = await run(esClient, ['default', 'team-a'], controller.signal);

    expect(results).toEqual([]);
  });

  it('returns an empty list for no namespaces', async () => {
    const { esClient } = createEsClient();

    expect(await run(esClient, [])).toEqual([]);
  });
});

describe('concurrency guard', () => {
  it('shares one run between overlapping callers', async () => {
    const { esClient } = createEsClient();
    const logger = createLogger();
    const options = { definition, esClient, logger, namespace: 'default' };

    // A data step is the plugin's own code and may not be idempotent, so two overlapping
    // reconciles must not both execute it.
    const [first, second] = await Promise.all([reconcile(options), reconcile(options)]);

    expect(first).toBe(second);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('allows a later run once the first has finished', async () => {
    const { esClient } = createEsClient();
    const logger = createLogger();
    const options = { definition, esClient, logger, namespace: 'default' };

    await reconcile(options);
    const second = await reconcile(options);

    // Second run finds it already at the target, so it is a no-op rather than a re-apply.
    expect(second.status).toBe('up_to_date');
  });

  it('does not serialise different namespaces against each other', async () => {
    const { esClient } = createEsClient();
    const logger = createLogger();

    const [a, b] = await Promise.all([
      reconcile({ definition, esClient, logger, namespace: 'default' }),
      reconcile({ definition, esClient, logger, namespace: 'team-a' }),
    ]);

    expect(a).not.toBe(b);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });
});
