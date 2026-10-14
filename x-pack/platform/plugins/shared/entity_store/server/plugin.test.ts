/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { createIndexPatternsStartMock } from '@kbn/data-views-plugin/server/mocks';
import { EntityStorePlugin } from './plugin';
import type {
  EntityStoreSetupContract,
  EntityStoreSetupPlugins,
  EntityStoreStartContract,
  EntityStoreStartPlugins,
} from './types';
import type { RegistrableEntityDefinition } from './domain/definitions/registry';

const makeDefinition = (type: string): RegistrableEntityDefinition => ({
  type,
  name: `Test '${type}' definition`,
  fields: [],
  identityField: { singleField: `${type}.name` },
  indexPatterns: ['logs-*'],
  managedBy: { kind: 'plugin', id: 'testPlugin' },
});

const types = (definitions: ReadonlyArray<{ type: string }>): string[] =>
  definitions.map(({ type }) => type);

const BUILT_IN_TYPES = ['user', 'host', 'service', 'generic'];

describe('EntityStorePlugin entity definition registry', () => {
  let plugin: EntityStorePlugin;
  let initializerContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let setupContract: EntityStoreSetupContract;
  let startPlugins: EntityStoreStartPlugins;

  const startPlugin = (): EntityStoreStartContract =>
    plugin.start(coreMock.createStart(), startPlugins);

  beforeEach(() => {
    initializerContext = coreMock.createPluginInitializerContext();
    plugin = new EntityStorePlugin(initializerContext);
    const setupPlugins: EntityStoreSetupPlugins = {
      taskManager: taskManagerMock.createSetup(),
      spaces: spacesMock.createSetup(),
      encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    };
    startPlugins = {
      taskManager: taskManagerMock.createStart(),
      spaces: spacesMock.createStart(),
      dataViews: createIndexPatternsStartMock(),
      security: securityMock.createStart(),
      encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
      licensing: licensingMock.createStart(),
      workflowsExtensions: workflowsExtensionsMock.createStart(),
    };
    setupContract = plugin.setup(coreMock.createSetup(), setupPlugins);
  });

  afterEach(() => {
    plugin.stop();
  });

  it('registers the built-in definitions at setup, in order', async () => {
    const client = startPlugin().getEntityDefinitionsClientForSpace('default');

    expect(types(await client.list())).toEqual(BUILT_IN_TYPES);
    expect(loggingSystemMock.collect(initializerContext.logger).error).toEqual([]);
  });

  it('marks the built-in definitions as managed by the entity store plugin', async () => {
    const client = startPlugin().getEntityDefinitionsClientForSpace('default');

    const definitions = await client.list();

    expect(definitions.map(({ managedBy }) => managedBy)).toEqual(
      BUILT_IN_TYPES.map(() => ({ kind: 'plugin', id: 'entityStore' }))
    );
  });

  it('accepts registrations during setup', async () => {
    expect(setupContract.registerEntityDefinition(makeDefinition('k8s.pod'))).toEqual({
      ok: true,
    });

    const client = startPlugin().getEntityDefinitionsClientForSpace('default');

    expect(types(await client.list())).toEqual([...BUILT_IN_TYPES, 'k8s.pod']);
    await expect(client.get('k8s.pod')).resolves.toBeDefined();
  });

  it('rejects an invalid registration during setup without throwing', async () => {
    let result: ReturnType<EntityStoreSetupContract['registerEntityDefinition']> | undefined;

    expect(() => {
      result = setupContract.registerEntityDefinition(makeDefinition('host'));
    }).not.toThrow();

    expect(result).toEqual({ ok: false, reason: 'type name is already registered' });
    expect(loggingSystemMock.collect(initializerContext.logger).error).toEqual([
      [expect.stringContaining(`Rejected entity definition 'host'`)],
    ]);
    const client = startPlugin().getEntityDefinitionsClientForSpace('default');
    expect(types(await client.list())).toEqual(BUILT_IN_TYPES);
  });

  it('logs an error through the registry logger for a registration after start', () => {
    startPlugin();

    setupContract.registerEntityDefinition(makeDefinition('k8s.pod'));

    const [{ value: pluginLogger }] = jest.mocked(initializerContext.logger.get).mock.results;
    expect(pluginLogger.get).toHaveBeenCalledWith('entity_definition_registry');
    expect(loggingSystemMock.collect(initializerContext.logger).error).toEqual([
      [
        expect.stringMatching(
          /^Rejected entity definition 'k8s\.pod' \(plugin [^)]+\): plugin setup has finished/
        ),
      ],
    ]);
  });

  it('rejects registrations after start', async () => {
    const startContract = startPlugin();

    const result = setupContract.registerEntityDefinition(makeDefinition('k8s.pod'));

    expect(result.ok).toBe(false);
    const client = startContract.getEntityDefinitionsClientForSpace('default');
    await expect(client.get('k8s.pod')).resolves.toBeUndefined();
    expect(types(await client.list())).toEqual(BUILT_IN_TYPES);
  });

  it('lists the built-ins', async () => {
    const client = startPlugin().getEntityDefinitionsClientForSpace('default');

    expect(types(await client.list())).toEqual(BUILT_IN_TYPES);
    expect(client.namespace).toBe('default');
  });

  it('derives the namespace from the request space', () => {
    const startContract = startPlugin();
    const request = httpServerMock.createKibanaRequest();
    jest.mocked(startPlugins.spaces.spacesService.getSpaceId).mockReturnValue(asSpaceId('space-a'));

    const client = startContract.getEntityDefinitionsClient(request);

    expect(client.namespace).toBe('space-a');
    expect(startPlugins.spaces.spacesService.getSpaceId).toHaveBeenCalledWith(request);
  });
});
