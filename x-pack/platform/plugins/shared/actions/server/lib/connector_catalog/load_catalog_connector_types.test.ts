/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ActionTypeRegistry } from '../../action_type_registry';
import { actionsConfigMock } from '../../actions_config.mock';
import { getConnectorType } from '../../fixtures';
import type { PluginSetupContract } from '../../plugin';
import { ActionExecutor } from '../action_executor';
import { ConnectorRateLimiter } from '../connector_rate_limiter';
import { loadFixture } from '../declarative_connectors/__fixtures__/load_fixture';
import { licenseStateMock } from '../license_state.mock';
import { TaskRunnerFactory } from '../task_runner_factory';
import { inMemoryMetricsMock } from '../../monitoring/in_memory_metrics.mock';
import { buildTypeFromStoredSpec } from './build_type_from_stored_spec';
import { loadCatalogConnectorTypes } from './load_catalog_connector_types';
import type {
  CatalogDefinitionRef,
  ConnectorCatalogStorage,
  StoredCatalogDefinition,
} from './types';

const abuseIpdbYaml = loadFixture('abuseipdb-1.1.0.yaml');

const createYaml = (id: string, version: string): string =>
  abuseIpdbYaml
    .replace('id: .declarative-abuseipdb', `id: ${id}`)
    .replace('version: 1.1.0', `version: ${version}`);

const createDefinition = (
  id: string,
  version: string,
  yaml = createYaml(id, version)
): StoredCatalogDefinition => ({
  connectorId: id,
  version,
  yaml,
  contentHash: `sha256:${id}${version}`,
  catalogVersion: '2026.11.1',
});

const createManifest = (refs: CatalogDefinitionRef[]): { raw: string } => ({
  raw: JSON.stringify({ connectors: refs }),
});

const createStorage = ({
  manifest,
  definitions = [],
}: {
  manifest?: { raw: string };
  definitions?: StoredCatalogDefinition[];
}): jest.Mocked<Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>> => ({
  getManifest: jest.fn().mockResolvedValue(manifest),
  getDefinitions: jest
    .fn()
    .mockImplementation(async (refs: CatalogDefinitionRef[]) =>
      definitions.filter((definition) =>
        refs.some(
          ({ id, version }) => id === definition.connectorId && version === definition.version
        )
      )
    ),
});

describe('loadCatalogConnectorTypes', () => {
  const logger = loggingSystemMock.createLogger();
  const taskManager = taskManagerMock.createSetup();
  const getAxiosInstanceWithAuth = jest.fn();
  const actions = {
    getActionsConfigurationUtilities: () => actionsConfigMock.create(),
    getAxiosInstanceWithAuth,
    getCredential: jest.fn(),
    getClientLeasePool: jest.fn(),
    getRelayClient: jest.fn(),
    getConnectorJwtSigner: jest.fn(),
  } as unknown as PluginSetupContract;
  let registry: ActionTypeRegistry;

  const load = (
    storage: ReturnType<typeof createStorage>,
    signal: AbortSignal = new AbortController().signal
  ) =>
    loadCatalogConnectorTypes({
      storage,
      actionTypeRegistry: registry,
      buildType: (definition) => buildTypeFromStoredSpec(definition, actions),
      logger,
      signal,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new ActionTypeRegistry({
      licensing: licensingMock.createSetup(),
      taskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({
          isESOCanEncrypt: true,
          connectorRateLimiter: new ConnectorRateLimiter({
            config: { email: { limit: 100, lookbackWindow: '1m' } },
          }),
        }),
        inMemoryMetricsMock.create()
      ),
      actionsConfigUtils: actionsConfigMock.create(),
      licenseState: licenseStateMock.create(),
      inMemoryConnectors: [],
    });
  });

  it('registers a type per seeded id and defines its task type without an outbound call', async () => {
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-a', version: '1.0.0' },
        { id: '.declarative-b', version: '1.0.0' },
      ]),
      definitions: [
        createDefinition('.declarative-a', '1.0.0'),
        createDefinition('.declarative-b', '1.0.0'),
      ],
    });

    await expect(load(storage)).resolves.toBe(2);

    expect(registry.has('.declarative-a')).toBe(true);
    expect(registry.has('.declarative-b')).toBe(true);
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({ 'actions:.declarative-a': expect.any(Object) })
    );
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({ 'actions:.declarative-b': expect.any(Object) })
    );
    expect(getAxiosInstanceWithAuth).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('registers nothing and does not warn when the manifest is missing', async () => {
    const storage = createStorage({});

    await expect(load(storage)).resolves.toBe(0);

    expect(storage.getDefinitions).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('registers nothing and does not warn when the manifest has no rows', async () => {
    const storage = createStorage({ manifest: createManifest([]) });

    await expect(load(storage)).resolves.toBe(0);

    expect(storage.getDefinitions).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('skips a manifest row that is not valid and keeps the others', async () => {
    const storage = createStorage({
      manifest: {
        raw: JSON.stringify({
          connectors: [
            { id: '.declarative-a', version: '1.0.0' },
            { id: 42, version: '1.0.0' },
            { id: '.declarative-b' },
            { id: '.declarative-c', version: 'not-a-version' },
            null,
          ],
        }),
      },
      definitions: [createDefinition('.declarative-a', '1.0.0')],
    });

    await expect(load(storage)).resolves.toBe(1);

    expect(storage.getDefinitions).toHaveBeenCalledWith(
      [{ id: '.declarative-a', version: '1.0.0' }],
      expect.anything()
    );
  });

  it('warns and registers nothing when the manifest is not valid JSON', async () => {
    const storage = createStorage({ manifest: { raw: '{not json' } });

    await expect(load(storage)).resolves.toBe(0);

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('skips a bad spec with a warning and registers the others', async () => {
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-good', version: '1.0.0' },
        { id: '.declarative-bad', version: '1.0.0' },
      ]),
      definitions: [
        createDefinition('.declarative-good', '1.0.0'),
        createDefinition('.declarative-bad', '1.0.0', 'id: [unclosed'),
      ],
    });

    await expect(load(storage)).resolves.toBe(1);

    expect(registry.has('.declarative-good')).toBe(true);
    expect(registry.has('.declarative-bad')).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.declarative-bad'));
  });

  it('skips a spec whose id is already registered and keeps the in-tree type', async () => {
    const inTreeType = getConnectorType({ id: '.declarative-a', name: 'In tree' });
    registry.register(inTreeType);
    const registeredBefore = registry.get('.declarative-a');
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-a', version: '1.0.0' },
        { id: '.declarative-b', version: '1.0.0' },
      ]),
      definitions: [
        createDefinition('.declarative-a', '1.0.0'),
        createDefinition('.declarative-b', '1.0.0'),
      ],
    });

    await expect(load(storage)).resolves.toBe(1);

    expect(registry.get('.declarative-a')).toBe(registeredBefore);
    expect(registry.get('.declarative-a').name).toBe('In tree');
    expect(registry.has('.declarative-b')).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.declarative-a'));
  });

  it('builds 1 type from the higher version when 2 versions are stored', async () => {
    const buildType = jest.fn((definition: StoredCatalogDefinition) =>
      buildTypeFromStoredSpec(definition, actions)
    );
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-a', version: '1.1.0' },
        { id: '.declarative-a', version: '1.2.0' },
      ]),
      definitions: [
        createDefinition('.declarative-a', '1.1.0'),
        createDefinition('.declarative-a', '1.2.0'),
      ],
    });

    await expect(
      loadCatalogConnectorTypes({
        storage,
        actionTypeRegistry: registry,
        buildType,
        logger,
        signal: new AbortController().signal,
      })
    ).resolves.toBe(1);

    expect(buildType).toHaveBeenCalledTimes(1);
    expect(buildType.mock.calls[0][0].version).toBe('1.2.0');
  });

  it('compares versions numerically by segment', async () => {
    const buildType = jest.fn((definition: StoredCatalogDefinition) =>
      buildTypeFromStoredSpec(definition, actions)
    );
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-a', version: '1.9.0' },
        { id: '.declarative-a', version: '1.10.0' },
        { id: '.declarative-b', version: '1.9' },
        { id: '.declarative-b', version: '1.10' },
      ]),
      definitions: [
        createDefinition('.declarative-a', '1.9.0'),
        createDefinition('.declarative-a', '1.10.0'),
        createDefinition('.declarative-b', '1.9'),
        createDefinition('.declarative-b', '1.10'),
      ],
    });

    await loadCatalogConnectorTypes({
      storage,
      actionTypeRegistry: registry,
      buildType,
      logger,
      signal: new AbortController().signal,
    });

    expect(buildType.mock.calls.map(([definition]) => definition.version).sort()).toEqual([
      '1.10',
      '1.10.0',
    ]);
  });

  it('does not fall back to a lower version when the highest fails to build', async () => {
    const storage = createStorage({
      manifest: createManifest([
        { id: '.declarative-a', version: '1.0.0' },
        { id: '.declarative-a', version: '2.0.0' },
      ]),
      definitions: [
        createDefinition('.declarative-a', '1.0.0'),
        createDefinition('.declarative-a', '2.0.0', 'id: [unclosed'),
      ],
    });

    await expect(load(storage)).resolves.toBe(0);

    expect(registry.has('.declarative-a')).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('still throws when an existing id is registered again after the load', async () => {
    const storage = createStorage({
      manifest: createManifest([{ id: '.declarative-a', version: '1.0.0' }]),
      definitions: [createDefinition('.declarative-a', '1.0.0')],
    });
    await load(storage);

    expect(() =>
      registry.register(getConnectorType({ id: '.declarative-a', name: 'Again' }))
    ).toThrow('Action type ".declarative-a" is already registered.');
  });

  it('registers nothing when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const storage = createStorage({
      manifest: createManifest([{ id: '.declarative-a', version: '1.0.0' }]),
      definitions: [createDefinition('.declarative-a', '1.0.0')],
    });

    await expect(load(storage, controller.signal)).resolves.toBe(0);

    expect(registry.has('.declarative-a')).toBe(false);
  });

  it('registers nothing when the signal aborts while the reads are pending', async () => {
    const controller = new AbortController();
    const storage = createStorage({
      manifest: createManifest([{ id: '.declarative-a', version: '1.0.0' }]),
      definitions: [createDefinition('.declarative-a', '1.0.0')],
    });
    storage.getDefinitions.mockImplementation(async () => {
      controller.abort();
      return [createDefinition('.declarative-a', '1.0.0')];
    });

    await expect(load(storage, controller.signal)).resolves.toBe(0);

    expect(registry.has('.declarative-a')).toBe(false);
  });
});
