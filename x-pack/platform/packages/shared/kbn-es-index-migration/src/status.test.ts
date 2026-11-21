/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { defineMigration } from './define_migration';
import { getMigrationStatus } from './status';
import { VERSION_META_KEY } from './backends/index_backend';
import type { ExecutionMode, LastRun } from './types';

const build = (execution: ExecutionMode = 'auto') =>
  defineMigration({
    id: 'asset-criticality',
    resource: { kind: 'index', name: (namespace) => `.entities-${namespace}` },
    baseline: 1,
    execution,
    versions: {
      2: { change: 'additive', mappings: { properties: {} } },
      3: { change: 'additive', mappings: { properties: {} } },
    },
  });

/** `versionByIndex` omitting an index means it does not exist. */
const createEsClient = (versionByIndex: Record<string, number | undefined>) =>
  ({
    indices: {
      exists: jest.fn(async ({ index }: { index: string }) => index in versionByIndex),
      getMapping: jest.fn(async ({ index }: { index: string }) => ({
        [index]: { mappings: { _meta: { [VERSION_META_KEY]: versionByIndex[index] } } },
      })),
    },
  } as unknown as ElasticsearchClient);

describe('getMigrationStatus', () => {
  it('reports the installed version per namespace', async () => {
    const esClient = createEsClient({ '.entities-default': 3, '.entities-team-a': 1 });

    const status = await getMigrationStatus({
      definition: build(),
      esClient,
      namespaces: ['default', 'team-a'],
    });

    expect(status.target).toBe(3);
    expect(status.namespaces).toEqual([
      expect.objectContaining({ namespace: 'default', installed: 3, versionsBehind: 0 }),
      expect.objectContaining({ namespace: 'team-a', installed: 1, versionsBehind: 2 }),
    ]);
  });

  it('reports the worst namespace as the overall gap', async () => {
    const esClient = createEsClient({ '.entities-default': 3, '.entities-team-a': 1 });

    const status = await getMigrationStatus({
      definition: build(),
      esClient,
      namespaces: ['default', 'team-a'],
    });

    // Sustained above zero is the alertable signal, so one stuck space must surface.
    expect(status.versionsBehind).toBe(2);
  });

  it('treats a missing resource as fully behind', async () => {
    const esClient = createEsClient({});

    const status = await getMigrationStatus({
      definition: build(),
      esClient,
      namespaces: ['default'],
    });

    expect(status.namespaces[0]).toEqual(
      expect.objectContaining({ exists: false, installed: undefined, versionsBehind: 3 })
    );
  });

  it('falls back to the baseline for an unstamped index', async () => {
    const esClient = createEsClient({ '.entities-default': undefined });

    const status = await getMigrationStatus({
      definition: build(),
      esClient,
      namespaces: ['default'],
    });

    expect(status.namespaces[0].installed).toBe(1);
  });

  it('is zero behind when everything matches', async () => {
    const esClient = createEsClient({ '.entities-default': 3 });

    const status = await getMigrationStatus({
      definition: build(),
      esClient,
      namespaces: ['default'],
    });

    expect(status.versionsBehind).toBe(0);
  });
});

describe('last-run reporting', () => {
  const esClient = createEsClient({ '.entities-default': 3 });
  const lastRun: LastRun = {
    at: '2026-11-17T00:00:00.000Z',
    total: 3,
    failed: 1,
    target: 3,
    lowestInstalled: 2,
    firstError: { namespace: 'team-a', version: 3, error: 'boom' },
  };

  it('reports an auto run that happened', async () => {
    const status = await getMigrationStatus({
      definition: build('auto'),
      esClient,
      namespaces: ['default'],
      lastRun,
    });

    expect(status.lastRunRecorded).toBe('yes');
    expect(status.lastRun?.failed).toBe(1);
    expect(status.lastRun?.firstError?.error).toBe('boom');
  });

  it('distinguishes an auto migration that has never run', async () => {
    const status = await getMigrationStatus({
      definition: build('auto'),
      esClient,
      namespaces: ['default'],
    });

    expect(status.lastRunRecorded).toBe('never_run');
  });

  it('says no record is kept for a manual migration, so a blank is not read as success', async () => {
    const status = await getMigrationStatus({
      definition: build('manual'),
      esClient,
      namespaces: ['default'],
    });

    // The error exists, but wherever the consumer called reconcile from - not here.
    expect(status.lastRunRecorded).toBe('not_applicable');
    expect(status.lastRun).toBeUndefined();
  });

  it('ignores a supplied record for a non-auto migration', async () => {
    const status = await getMigrationStatus({
      definition: build('manual'),
      esClient,
      namespaces: ['default'],
      lastRun,
    });

    expect(status.lastRunRecorded).toBe('not_applicable');
    expect(status.lastRun).toBeUndefined();
  });
});
