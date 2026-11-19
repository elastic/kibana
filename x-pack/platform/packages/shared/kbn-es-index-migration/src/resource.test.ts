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
import { getMigrationStatus } from './status';
import { summarise } from './task';
import { isGlobal, namespacesFor, resolveName } from './resource';
import { VERSION_META_KEY } from './backends/index_backend';
import { GLOBAL_NAMESPACE } from './types';
import type { MigrationResource, ReconcileResult } from './types';

const perNamespace: MigrationResource = {
  kind: 'index',
  name: (namespace) => `.entities-${namespace}`,
};

const global: MigrationResource = {
  kind: 'index',
  scope: 'global',
  name: () => '.shared-index',
};

const createLogger = (): Logger =>
  ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as Logger);

const createEsClient = () => {
  const versions = new Map<string, number>();
  return {
    indices: {
      exists: jest.fn(async () => true),
      getMapping: jest.fn(async ({ index }: { index: string }) => ({
        [index]: { mappings: { _meta: { [VERSION_META_KEY]: versions.get(index) ?? 1 } } },
      })),
      putMapping: jest.fn(async ({ index }: { index: string }) => {
        versions.set(index, 2);
        return { acknowledged: true };
      }),
      create: jest.fn(async () => ({ acknowledged: true })),
    },
  } as unknown as ElasticsearchClient;
};

const build = (resource: MigrationResource) =>
  defineMigration({
    id: 'scoped',
    resource,
    baseline: 1,
    execution: 'manual',
    versions: { 2: { change: 'additive', mappings: { properties: {} } } },
  });

describe('resource scope', () => {
  it('defaults to per-namespace', () => {
    expect(isGlobal(perNamespace)).toBe(false);
  });

  it('resolves a name per namespace', () => {
    expect(resolveName(perNamespace, 'team-a')).toBe('.entities-team-a');
  });

  it('ignores the namespace for a global resource', () => {
    expect(resolveName(global, 'team-a')).toBe('.shared-index');
    expect(resolveName(global, 'default')).toBe('.shared-index');
  });

  it('collapses a global resource to a single target', () => {
    expect(namespacesFor(global, ['a', 'b', 'c'])).toEqual([GLOBAL_NAMESPACE]);
  });

  it('keeps every namespace for a per-namespace resource', () => {
    expect(namespacesFor(perNamespace, ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('reconcileAll honours scope', () => {
  it('reconciles a per-namespace resource once per space', async () => {
    const esClient = createEsClient();

    const results = await reconcileAll({
      definition: build(perNamespace),
      esClient,
      logger: createLogger(),
      namespaces: ['a', 'b', 'c'],
    });

    expect(results).toHaveLength(3);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(3);
  });

  it('reconciles a global resource exactly once, whatever the space count', async () => {
    const esClient = createEsClient();

    const results = await reconcileAll({
      definition: build(global),
      esClient,
      logger: createLogger(),
      namespaces: ['a', 'b', 'c', 'd', 'e'],
    });

    // Repeating it per space was correct only by accident, and cost a request pair each.
    expect(results).toHaveLength(1);
    expect(results[0].namespace).toBe(GLOBAL_NAMESPACE);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });
});

describe('concurrency guard honours scope', () => {
  it('guards a global resource across different namespaces', async () => {
    const esClient = createEsClient();
    const definition = build(global);
    const logger = createLogger();

    const [a, b] = await Promise.all([
      reconcile({ definition, esClient, logger, namespace: 'team-a' }),
      reconcile({ definition, esClient, logger, namespace: 'team-b' }),
    ]);

    // Different namespaces, same underlying index - so one run, not two.
    expect(a).toBe(b);
    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });
});

describe('status honours scope', () => {
  it('reports one entry for a global resource', async () => {
    const status = await getMigrationStatus({
      definition: build(global),
      esClient: createEsClient(),
      namespaces: ['a', 'b', 'c'],
    });

    expect(status.namespaces).toHaveLength(1);
    expect(status.namespaces[0].resourceName).toBe('.shared-index');
  });
});

describe('summarise', () => {
  const result = (overrides: Partial<ReconcileResult> = {}): ReconcileResult => ({
    migrationId: 'scoped',
    resourceName: '.x',
    namespace: 'default',
    status: 'migrated',
    installed: 3,
    target: 3,
    applied: [],
    ...overrides,
  });

  it('is fixed size regardless of how many namespaces ran', () => {
    const many = summarise(Array.from({ length: 500 }, () => result()));

    // Task Manager reads and writes state every cycle, so this must not grow with spaces.
    expect(Object.keys(many).sort()).toEqual(
      ['at', 'failed', 'lowestInstalled', 'target', 'total'].sort()
    );
    expect(many.total).toBe(500);
  });

  it('counts failures rather than reporting only one', () => {
    const summary = summarise([
      result(),
      result({ namespace: 'a', status: 'failed', error: 'first' }),
      result({ namespace: 'b', status: 'failed', error: 'second' }),
    ]);

    expect(summary).toMatchObject({ total: 3, failed: 2 });
  });

  it('keeps the first failure as a worked example', () => {
    const summary = summarise([
      result({ namespace: 'a', status: 'failed', installed: 1, error: 'first' }),
      result({ namespace: 'b', status: 'failed', error: 'second' }),
    ]);

    expect(summary.firstError).toEqual({ namespace: 'a', version: 2, error: 'first' });
  });

  it('omits firstError when nothing failed', () => {
    expect(summarise([result(), result()]).firstError).toBeUndefined();
  });

  it('reports the lowest installed version, so a stuck space is visible', () => {
    const summary = summarise([
      result({ installed: 3 }),
      result({ namespace: 'a', installed: 1 }),
      result({ namespace: 'b', installed: 3 }),
    ]);

    expect(summary.lowestInstalled).toBe(1);
  });
});
