/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { defineMigration } from './define_migration';
import { createMigrationRegistry } from './registry';
import { DEFAULT_INTERVAL, DEFAULT_TIMEOUT, taskIdFor, taskTypeFor } from './task';
import type { ExecutionMode, MigrationDefinition } from './types';

const build = (
  id: string,
  execution: ExecutionMode = 'manual',
  index = `.${id}`
): MigrationDefinition =>
  defineMigration({
    id,
    resource: { kind: 'index', name: () => index },
    baseline: 1,
    execution,
    versions: { 2: { change: 'additive', mappings: { properties: {} } } },
  });

const setupContract = () =>
  ({ registerTaskDefinitions: jest.fn() } as unknown as jest.Mocked<TaskManagerSetupContract>);

const startContract = () =>
  ({
    ensureScheduled: jest.fn(async () => ({})),
  } as unknown as jest.Mocked<TaskManagerStartContract>);

const startOptions = (taskManager: TaskManagerStartContract) => ({
  taskManager,
  getEsClient: () => ({} as ElasticsearchClient),
  getNamespaces: () => ['default'],
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger,
});

describe('createMigrationRegistry', () => {
  it('starts empty', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });

    expect(registry.size).toBe(0);
    expect(registry.all()).toEqual([]);
  });

  it('registers and retrieves by id', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });
    const definition = build('asset-criticality');

    registry.register(definition);

    expect(registry.get('asset-criticality')).toBe(definition);
    expect(registry.has('asset-criticality')).toBe(true);
  });

  it('rejects a different migration reusing an id', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });
    registry.register(build('asset-criticality'));

    expect(() =>
      registry.register(build('asset-criticality', 'manual', '.something-else'))
    ).toThrow(/already registered as "asset-criticality"/);
  });

  it('tolerates the same definition being registered twice', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });
    const definition = build('asset-criticality');

    registry.register(definition);
    registry.register(definition);

    expect(registry.size).toBe(1);
  });

  it('enumerates every registration', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });
    registry.register(build('asset-criticality'));
    registry.register(build('risk-score'));

    expect(registry.all().map(({ id }) => id)).toEqual(['asset-criticality', 'risk-score']);
  });

  it('keeps registries independent of one another', () => {
    const first = createMigrationRegistry({ pluginId: 'a' });
    const second = createMigrationRegistry({ pluginId: 'b' });

    first.register(build('asset-criticality'));

    expect(second.size).toBe(0);
  });
});

describe('task wiring', () => {
  it('registers one task type for the plugin, during setup', () => {
    const taskManager = setupContract();

    createMigrationRegistry({ pluginId: 'securitySolution', taskManager });

    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(Object.keys(taskManager.registerTaskDefinitions.mock.calls[0][0])).toEqual([
      'es-index-migration:securitySolution',
    ]);
  });

  it('registers the task type once regardless of how many migrations follow', () => {
    const taskManager = setupContract();
    const registry = createMigrationRegistry({ pluginId: 'securitySolution', taskManager });

    registry.register(build('a', 'auto'));
    registry.register(build('b', 'auto'));

    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
  });

  it('schedules the task on start', async () => {
    const taskManager = setupContract();
    const start = startContract();
    const registry = createMigrationRegistry({ pluginId: 'securitySolution', taskManager });
    registry.register(build('a', 'auto'));

    await registry.start(startOptions(start));

    expect(start.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskIdFor('securitySolution'),
        taskType: taskTypeFor('securitySolution'),
      })
    );
  });

  it('does not schedule anything when no taskManager was supplied', async () => {
    const start = startContract();
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });
    registry.register(build('a'));

    await registry.start(startOptions(start));

    expect(start.ensureScheduled).not.toHaveBeenCalled();
  });
});

describe('consumer-supplied timing', () => {
  const definitionOf = (taskManager: jest.Mocked<TaskManagerSetupContract>) =>
    taskManager.registerTaskDefinitions.mock.calls[0][0]['es-index-migration:securitySolution'];

  it('uses the default timeout when none is given', () => {
    const taskManager = setupContract();

    createMigrationRegistry({ pluginId: 'securitySolution', taskManager });

    expect(definitionOf(taskManager).timeout).toBe(DEFAULT_TIMEOUT);
  });

  it('uses a supplied timeout, for heavier or trivially fast migrations', () => {
    const taskManager = setupContract();

    createMigrationRegistry({ pluginId: 'securitySolution', taskManager, timeout: '45m' });

    expect(definitionOf(taskManager).timeout).toBe('45m');
  });

  it('uses the default interval when none is given', async () => {
    const taskManager = setupContract();
    const start = startContract();
    const registry = createMigrationRegistry({ pluginId: 'securitySolution', taskManager });

    await registry.start(startOptions(start));

    expect(start.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { interval: DEFAULT_INTERVAL } })
    );
  });

  it('uses a supplied interval', async () => {
    const taskManager = setupContract();
    const start = startContract();
    const registry = createMigrationRegistry({ pluginId: 'securitySolution', taskManager });

    await registry.start({ ...startOptions(start), interval: '5m' });

    expect(start.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { interval: '5m' } })
    );
  });
});

describe('guards', () => {
  it('refuses an "auto" migration when no taskManager was supplied', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });

    // Without this the migration would never run, and nothing would say so.
    expect(() => registry.register(build('a', 'auto'))).toThrow(
      /execution is "auto" but the registry was created without a taskManager/
    );
  });

  it('accepts an "auto" migration when a taskManager was supplied', () => {
    const registry = createMigrationRegistry({
      pluginId: 'securitySolution',
      taskManager: setupContract(),
    });

    expect(() => registry.register(build('a', 'auto'))).not.toThrow();
  });

  it('allows "manual" without a taskManager, since its caller drives it', () => {
    const registry = createMigrationRegistry({ pluginId: 'securitySolution' });

    expect(() => registry.register(build('a', 'manual'))).not.toThrow();
  });

  it('refuses registration after start, which Task Manager would have missed', async () => {
    const registry = createMigrationRegistry({
      pluginId: 'securitySolution',
      taskManager: setupContract(),
    });
    await registry.start(startOptions(startContract()));

    expect(() => registry.register(build('late', 'auto'))).toThrow(/after start\(\)/);
  });
});
