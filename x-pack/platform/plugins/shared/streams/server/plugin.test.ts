/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDecipheriv, randomBytes } from 'crypto';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PluginInitializerContext } from '@kbn/core/server';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { StreamsPlugin } from './plugin';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetupDependencies, StreamsPluginStartDependencies } from './types';

jest.mock('./agent_builder/register', () => ({
  registerStreamsAgentBuilder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./lib/saved_objects/register_saved_objects', () => ({
  registerStreamsSavedObjects: jest.fn(),
}));
jest.mock('./register_fields_metadata_extractors', () => ({
  registerFieldsMetadataExtractors: jest.fn(),
}));
jest.mock('./register_suggestions_inference_features', () => ({
  registerSuggestionsInferenceFeatures: jest.fn(),
}));
jest.mock('./feature_flags', () => ({ registerFeatureFlags: jest.fn() }));

jest.mock('./lib/unit_config/config_distributor_client', () => {
  const actual = jest.requireActual('./lib/unit_config/config_distributor_client');
  return { createConfigDistributorClient: jest.fn(actual.createConfigDistributorClient) };
});

jest.mock('./lib/unit_config/seal_credentials', () => {
  const actual = jest.requireActual('./lib/unit_config/seal_credentials');
  return { ...actual, createCredentialPreparer: jest.fn(actual.createCredentialPreparer) };
});

const { registerStreamsAgentBuilder } = jest.requireMock('./agent_builder/register');
const { createCredentialPreparer } = jest.requireMock('./lib/unit_config/seal_credentials');
const { createConfigDistributorClient } = jest.requireMock(
  './lib/unit_config/config_distributor_client'
);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function getConfig(overrides: Partial<StreamsConfig> = {}): StreamsConfig {
  return {
    canvas: { enabled: false },
    distributor: { ssl: {} },
    encryptionKey: {},
    preconfigured: { enabled: false, stream_definitions: [] },
    workers: {
      patternExtraction: {
        enabled: false,
        minThreads: 0,
        maxThreads: 1,
        maxQueue: 10,
        idleTimeout: 30000,
        taskTimeout: 30000,
      },
    },
    ...overrides,
  } as StreamsConfig;
}

function createPluginsSetup(): jest.Mocked<StreamsPluginSetupDependencies> {
  return {
    encryptedSavedObjects: {
      canEncrypt: false,
      registerType: jest.fn(),
    } as unknown as StreamsPluginSetupDependencies['encryptedSavedObjects'],
    alerting: alertsMock.createSetup(),
    ruleRegistry: {
      registerType: jest.fn(),
    } as unknown as StreamsPluginSetupDependencies['ruleRegistry'],
    features: featuresPluginMock.createSetup(),
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    fieldsMetadata: {
      registerIntegrationFieldsExtractor: jest.fn(),
    } as unknown as StreamsPluginSetupDependencies['fieldsMetadata'],
    taskManager: taskManagerMock.createSetup(),
  } as unknown as jest.Mocked<StreamsPluginSetupDependencies>;
}

describe('StreamsPlugin agent builder registration gating', () => {
  let context: PluginInitializerContext<StreamsConfig>;
  let plugin: StreamsPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let pluginsSetup: jest.Mocked<StreamsPluginSetupDependencies>;

  const createServerlessContext = () => {
    const ctx = coreMock.createPluginInitializerContext<StreamsConfig>(getConfig());
    Object.defineProperty(ctx.env, 'packageInfo', {
      value: { ...ctx.env.packageInfo, buildFlavor: 'serverless' as const },
    });
    return ctx;
  };

  const setupServerlessPlugin = (projectType: string | undefined) => {
    context = createServerlessContext();
    plugin = new StreamsPlugin(context);
    pluginsSetup.cloud = {
      isServerlessEnabled: true,
      serverless: { projectType },
    } as StreamsPluginSetupDependencies['cloud'];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context = coreMock.createPluginInitializerContext<StreamsConfig>(getConfig());
    plugin = new StreamsPlugin(context);
    coreSetup = coreMock.createSetup();
    pluginsSetup = createPluginsSetup();
    pluginsSetup.agentBuilder = {} as NonNullable<StreamsPluginSetupDependencies['agentBuilder']>;
  });

  it('registers agent builder when not in serverless', async () => {
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('registers agent builder for serverless observability projects', async () => {
    setupServerlessPlugin('observability');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('registers agent builder for serverless security projects', async () => {
    setupServerlessPlugin('security');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).toHaveBeenCalled();
  });

  it('does not register agent builder for serverless es projects', async () => {
    setupServerlessPlugin('es');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder for serverless vectordb projects', async () => {
    setupServerlessPlugin('vectordb');
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder when serverless project type is undefined', async () => {
    setupServerlessPlugin(undefined);
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });

  it('does not register agent builder when agentBuilder plugin is absent', async () => {
    delete pluginsSetup.agentBuilder;
    plugin.setup(coreSetup, pluginsSetup);
    await flushPromises();

    expect(registerStreamsAgentBuilder).not.toHaveBeenCalled();
  });
});

describe('StreamsPlugin credential sealing wiring', () => {
  const KID = '20261014_101500_a3f19b2c';
  let dir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    dir = await mkdtemp(join(tmpdir(), 'streams-plugin-key-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const setupPlugin = (config: StreamsConfig, cloud?: StreamsPluginSetupDependencies['cloud']) => {
    const plugin = new StreamsPlugin(coreMock.createPluginInitializerContext(config));
    plugin.setup(coreMock.createSetup(), { ...createPluginsSetup(), cloud });
    return createConfigDistributorClient.mock.calls[0][0];
  };

  const registeredPrepareCredentials = (
    config: StreamsConfig,
    cloud?: StreamsPluginSetupDependencies['cloud']
  ) => {
    setupPlugin(config, cloud);
    return createCredentialPreparer.mock.results[0]?.value;
  };

  it('passes the serverless project id as the fallback target id', () => {
    const { fallbackTargetId } = setupPlugin(getConfig(), {
      serverless: { projectId: 'abcdef12' },
    } as StreamsPluginSetupDependencies['cloud']);

    expect(fallbackTargetId).toBe('abcdef12');
  });

  it('seals with the mounted key when encryptionKey.path is set', async () => {
    const key = randomBytes(32);
    await writeFile(join(dir, 'current-kid'), KID);
    await writeFile(join(dir, `streams-encryption-key.${KID}`), key);

    const prepareCredentials = registeredPrepareCredentials(
      getConfig({
        encryptionKey: { path: dir },
        distributor: { url: 'http://localhost:1', ssl: {} },
      }),
      { serverless: { projectId: 'abcdef12' } } as StreamsPluginSetupDependencies['cloud']
    );
    const {
      credentials: [{ name, ciphertext }],
    } = await prepareCredentials({
      secrets: { 'es-prod': 's3cret' },
      previous: { secrets: {}, sealed: [] },
    });

    const [version, kid, iv, ct] = ciphertext.split('.');
    const sealed = Buffer.from(ct, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from('abcdef12', 'utf8'));
    decipher.setAuthTag(sealed.subarray(sealed.length - 16));
    const plaintext = Buffer.concat([
      decipher.update(sealed.subarray(0, sealed.length - 16)),
      decipher.final(),
    ]).toString('utf8');
    expect({ version, kid, name, plaintext }).toEqual({
      version: 'v1',
      kid: KID,
      name: 'es-prod',
      plaintext: 's3cret',
    });
  });

  it('registers no preparer when encryptionKey.path is unset', () => {
    expect(registeredPrepareCredentials(getConfig())).toBeUndefined();
    expect(createCredentialPreparer).not.toHaveBeenCalled();
  });
});

describe('StreamsPlugin unit republish task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const startPlugin = (config: StreamsConfig) => {
    const plugin = new StreamsPlugin(coreMock.createPluginInitializerContext(config));
    const pluginsSetup = createPluginsSetup();
    plugin.setup(coreMock.createSetup(), pluginsSetup);
    const taskManagerStart = taskManagerMock.createStart();
    plugin.start(coreMock.createStart(), {
      taskManager: taskManagerStart,
    } as unknown as StreamsPluginStartDependencies);
    return { taskManagerSetup: pluginsSetup.taskManager, taskManagerStart };
  };

  it('registers and schedules the task when canvas and the distributor are configured', async () => {
    const { taskManagerSetup, taskManagerStart } = startPlugin(
      getConfig({
        canvas: { enabled: true },
        distributor: { url: 'http://localhost:18081', ssl: {} },
      } as Partial<StreamsConfig>)
    );
    await flushPromises();

    expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
      'streams:republish-units': expect.objectContaining({ timeout: '2m' }),
    });
    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'streams:republish-units', schedule: { interval: '30m' } })
    );
    expect(taskManagerStart.runSoon).toHaveBeenCalledWith('streams:republish-units');
  });

  const setupRepublishRun = async () => {
    const { createConfigDistributorClient: actualCreateClient } = jest.requireActual<
      typeof import('./lib/unit_config/config_distributor_client')
    >('./lib/unit_config/config_distributor_client');
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
    createConfigDistributorClient.mockImplementationOnce(
      (args: Parameters<typeof actualCreateClient>[0]) => actualCreateClient({ ...args, fetchImpl })
    );

    const storedConfiguration = {
      id: 'default',
      type: 'streams-configuration',
      version: 'v1',
      references: [],
      attributes: { unit_id: 'default', unit: {}, secrets: {}, sealed_credentials: [] },
    };
    const encryptedSavedObjectsClient = {
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(storedConfiguration),
    };
    const encryptedSavedObjectsStart = { getClient: jest.fn(() => encryptedSavedObjectsClient) };
    const coreSetup = coreMock.createSetup({
      pluginStartDeps: { encryptedSavedObjects: encryptedSavedObjectsStart },
    });
    const pluginsSetup = createPluginsSetup();
    const plugin = new StreamsPlugin(
      coreMock.createPluginInitializerContext(
        getConfig({
          canvas: { enabled: true },
          distributor: { url: 'http://localhost:18081', ssl: {} },
        } as Partial<StreamsConfig>)
      )
    );
    plugin.setup(coreSetup, pluginsSetup);

    const [coreStart] = await coreSetup.getStartServices();
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [{ ...storedConfiguration, score: 0 }],
      total: 1,
      per_page: 100,
      page: 1,
    });
    soClient.get.mockResolvedValue(storedConfiguration);
    (coreStart.savedObjects.getUnsafeInternalClient as jest.Mock).mockReturnValue(soClient);

    const definition = jest.mocked(pluginsSetup.taskManager.registerTaskDefinitions).mock
      .calls[0][0]['streams:republish-units'];
    const runTask = () =>
      definition
        .createTaskRunner({
          taskInstance: {},
          signal: new AbortController().signal,
        } as unknown as RunContext)
        .run();
    return { plugin, runTask, coreStart, encryptedSavedObjectsStart, fetchImpl };
  };

  it('runs the registered task through the encrypting internal client and publishes', async () => {
    const { runTask, coreStart, encryptedSavedObjectsStart, fetchImpl } = await setupRepublishRun();

    await runTask();

    // A task has no request, so the spaces extension cannot authorize `namespaces: ['*']`.
    expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: ['streams-configuration'],
      excludedExtensions: ['spaces'],
    });
    expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalled();
    expect(encryptedSavedObjectsStart.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: ['streams-configuration'],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:18081/v1/units/default',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('stops republishing once the plugin stops', async () => {
    const { plugin, runTask, fetchImpl } = await setupRepublishRun();

    await plugin.stop();
    await runTask();

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ['canvas is disabled', { distributor: { url: 'http://localhost:18081', ssl: {} } }],
    ['the distributor URL is unset', { canvas: { enabled: true } }],
  ])('registers the task but removes instead of scheduling it when %s', async (_, overrides) => {
    const { taskManagerSetup, taskManagerStart } = startPlugin(
      getConfig(overrides as Partial<StreamsConfig>)
    );
    await flushPromises();

    expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
      'streams:republish-units': expect.objectContaining({ timeout: '2m' }),
    });
    expect(taskManagerStart.ensureScheduled).not.toHaveBeenCalled();
    expect(taskManagerStart.removeIfExists).toHaveBeenCalledWith('streams:republish-units');
  });
});
