/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import moment from 'moment';
import { coreMock, elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { GEN_AI_SETTINGS_INFERENCE_STREAMING } from '@kbn/management-settings-ids';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  InferenceConnectorType,
  InferenceTaskErrorCode,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { InferenceSetupDependencies } from './types';
import {
  createInferenceStreamingResolver,
  InferencePlugin,
  resolveOnFailureMode,
  resolveReplacementsEncryptionKey,
} from './plugin';
import { createChatModel, createClient } from './inference_client';
import { getConnectorById } from './util/get_connector_by_id';

jest.mock('./inference_client', () => ({
  ...jest.requireActual('./inference_client'),
  createClient: jest.fn(),
  createChatModel: jest.fn(),
}));

jest.mock('./util/get_connector_by_id', () => ({
  ...jest.requireActual('./util/get_connector_by_id'),
  getConnectorById: jest.fn(),
}));

const createClientMock = jest.mocked(createClient);
const createChatModelMock = jest.mocked(createChatModel);
const getConnectorByIdMock = jest.mocked(getConnectorById);

describe('resolveReplacementsEncryptionKey', () => {
  it('returns undefined when anonymization is disabled', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: false,
      })
    ).resolves.toBeUndefined();
  });

  it('returns policy-managed key when anonymization is enabled', async () => {
    const getReplacementsEncryptionKey = jest.fn().mockResolvedValue('managed-key');

    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
        policyService: { getReplacementsEncryptionKey },
      })
    ).resolves.toBe('managed-key');
  });

  it('returns undefined when policy service is unavailable', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
      })
    ).resolves.toBeUndefined();
  });
});

describe('resolveOnFailureMode', () => {
  it('returns the mode saved in the ai:anonymizationSettings setting', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('allow_unsafe');
  });

  it('blocks when the setting does not say otherwise', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.resolve({ rules: [] }),
      })
    ).resolves.toBe('block');
  });

  it('blocks on the profile-based path, which has no failure-mode concept', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: true,
        legacySettingsPromise: Promise.resolve({ rules: [], onFailure: 'allow_unsafe' }),
      })
    ).resolves.toBe('block');
  });

  it('blocks instead of rejecting when the setting cannot be read, so an unawaited promise is never an unhandled rejection', async () => {
    await expect(
      resolveOnFailureMode({
        anonymizationEnabled: false,
        legacySettingsPromise: Promise.reject(new Error('saved objects unavailable')),
      })
    ).resolves.toBe('block');
  });
});

describe('createInferenceStreamingResolver', () => {
  const servicesCall = { method: 'GET', path: '/_inference/_services' };

  const setup = ({ streamingSetting }: { streamingSetting: boolean | undefined }) => {
    const coreStart = coreMock.createStart();
    const request = httpServerMock.createKibanaRequest();
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const internalEsClient = clusterClient.asInternalUser;
    const currentUserEsClient = clusterClient.asScoped().asCurrentUser;
    const core = {
      elasticsearch: { ...coreStart.elasticsearch, client: clusterClient },
      savedObjects: coreStart.savedObjects,
      uiSettings: coreStart.uiSettings,
    };
    const uiSettingsClient = core.uiSettings.asScopedToClient(
      core.savedObjects.getScopedClient(request)
    );
    jest.mocked(uiSettingsClient.get).mockResolvedValue(streamingSetting);

    // the caller cannot list inference services; only the internal user can
    currentUserEsClient.transport.request.mockRejectedValue(
      new errors.ResponseError({ statusCode: 403, body: {}, warnings: null, meta: {} as never })
    );
    internalEsClient.transport.request.mockResolvedValue([
      { service: 'openai', features: { non_streaming_chat: { supported: true } } },
    ]);

    const resolver = createInferenceStreamingResolver({
      core,
      logger: loggerMock.create(),
      request,
    });
    return { resolver, request, core, internalEsClient, currentUserEsClient, uiSettingsClient };
  };

  it('selects non-streaming through the internal user even when the caller cannot read services', async () => {
    const { resolver, request, core, internalEsClient, currentUserEsClient, uiSettingsClient } =
      setup({ streamingSetting: false });

    await expect(resolver('openai')).resolves.toBe(false);

    expect(core.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(uiSettingsClient.get).toHaveBeenCalledWith(GEN_AI_SETTINGS_INFERENCE_STREAMING);
    expect(internalEsClient.transport.request).toHaveBeenCalledWith(servicesCall);
    expect(currentUserEsClient.transport.request).not.toHaveBeenCalled();
  });

  it('streams without reading services when the setting is not explicitly off', async () => {
    for (const streamingSetting of [true, undefined]) {
      const { resolver, internalEsClient, currentUserEsClient } = setup({ streamingSetting });

      await expect(resolver('openai')).resolves.toBe(true);

      expect(internalEsClient.transport.request).not.toHaveBeenCalled();
      expect(currentUserEsClient.transport.request).not.toHaveBeenCalled();
    }
  });
});

const createPlugin = (workersEnabled: boolean) =>
  new InferencePlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      workers: {
        anonymization: {
          enabled: workersEnabled,
          minThreads: 0,
          maxThreads: 3,
          maxQueue: 20,
          idleTimeout: moment.duration(30, 'seconds'),
          taskTimeout: moment.duration(15, 'seconds'),
        },
      },
    })
  );

const setupDependencies = { actions: {} } as unknown as InferenceSetupDependencies;

describe('InferencePlugin.setup', () => {
  const setupPlugin = (
    workersEnabled: boolean,
    plugins: Partial<InferenceSetupDependencies> = {}
  ) => {
    return createPlugin(workersEnabled).setup(coreMock.createSetup(), {
      ...setupDependencies,
      ...plugins,
    });
  };

  for (const workersEnabled of [true, false]) {
    it(`tells the anonymization settings plugin whether anonymization workers are enabled (${workersEnabled})`, () => {
      const configurePatternTester = jest.fn();

      setupPlugin(workersEnabled, { aiAnonymizationSettings: { configurePatternTester } });

      expect(configurePatternTester).toHaveBeenCalledTimes(1);
      expect(configurePatternTester).toHaveBeenCalledWith({ enabled: workersEnabled });
    });
  }

  it('does not require the anonymization settings plugin', () => {
    expect(() => setupPlugin(true)).not.toThrow();
  });

  it('accepts one feature endpoint resolver', () => {
    const { registerFeatureEndpointResolver } = setupPlugin(true);

    expect(() => registerFeatureEndpointResolver(jest.fn())).not.toThrow();
  });

  it('throws when a second feature endpoint resolver is registered', () => {
    const { registerFeatureEndpointResolver } = setupPlugin(true);
    registerFeatureEndpointResolver(jest.fn());

    expect(() => registerFeatureEndpointResolver(jest.fn())).toThrow(
      'A feature endpoint resolver is already registered'
    );
  });
});

describe('InferencePlugin.start getClient', () => {
  const request = httpServerMock.createKibanaRequest();

  const getClientOptions = async (resolver?: jest.Mock) => {
    const plugin = createPlugin(false);
    const { registerFeatureEndpointResolver } = plugin.setup(
      coreMock.createSetup(),
      setupDependencies
    );
    if (resolver) {
      registerFeatureEndpointResolver(resolver);
    }
    plugin
      .start(coreMock.createStart(), { actions: actionsMock.createStart() })
      .getClient({ request });
    await plugin.stop();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    return createClientMock.mock.calls[0][0];
  };

  afterEach(() => {
    createClientMock.mockReset();
  });

  it('passes the registered feature endpoint resolver scoped to the request', async () => {
    const resolver = jest.fn().mockResolvedValue({ connectorId: 'top' });
    const { resolveFeatureEndpoint } = await getClientOptions(resolver);

    await expect(resolveFeatureEndpoint?.('my_feature')).resolves.toEqual({ connectorId: 'top' });
    expect(resolver).toHaveBeenCalledWith('my_feature', request);
  });

  it('passes no feature endpoint resolver when none is registered', async () => {
    const { resolveFeatureEndpoint } = await getClientOptions();

    expect(resolveFeatureEndpoint).toBeUndefined();
  });
});

describe('InferencePlugin.start getChatModel', () => {
  const request = httpServerMock.createKibanaRequest();

  const getChatModelOptions = async (
    target: { connectorId: string } | { featureId: string },
    resolver?: jest.Mock
  ) => {
    const plugin = createPlugin(false);
    const { registerFeatureEndpointResolver } = plugin.setup(
      coreMock.createSetup(),
      setupDependencies
    );
    if (resolver) {
      registerFeatureEndpointResolver(resolver);
    }
    await plugin
      .start(coreMock.createStart(), { actions: actionsMock.createStart() })
      .getChatModel({ request, ...target, chatModelOptions: {} });
    await plugin.stop();
    expect(createChatModelMock).toHaveBeenCalledTimes(1);
    return createChatModelMock.mock.calls[0][0];
  };

  afterEach(() => {
    createChatModelMock.mockReset();
  });

  it('passes the registered feature endpoint resolver to getChatModel', async () => {
    const resolver = jest.fn().mockResolvedValue({ connectorId: 'top' });
    const { resolveFeatureEndpoint, featureId, connectorId } = await getChatModelOptions(
      { featureId: 'my_feature' },
      resolver
    );

    expect(featureId).toBe('my_feature');
    expect(connectorId).toBeUndefined();
    expect(resolveFeatureEndpoint).toBeDefined();
    await expect(resolveFeatureEndpoint?.('my_feature')).resolves.toEqual({ connectorId: 'top' });
    expect(resolver).toHaveBeenCalledWith('my_feature', request);
  });

  it('forwards the connectorId to getChatModel', async () => {
    const { featureId, connectorId } = await getChatModelOptions({ connectorId: 'my-connector' });

    expect(connectorId).toBe('my-connector');
    expect(featureId).toBeUndefined();
  });
});

describe('InferencePlugin.start resolveFeatureConnector', () => {
  const request = httpServerMock.createKibanaRequest();
  const connector: InferenceConnector = {
    type: InferenceConnectorType.OpenAI,
    name: 'Top connector',
    connectorId: 'top',
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
  };

  let plugin: InferencePlugin;

  const startPlugin = (resolver?: jest.Mock) => {
    plugin = createPlugin(false);
    const { registerFeatureEndpointResolver } = plugin.setup(
      coreMock.createSetup(),
      setupDependencies
    );
    if (resolver) {
      registerFeatureEndpointResolver(resolver);
    }
    const coreStart = coreMock.createStart();
    const actions = actionsMock.createStart();
    const start = plugin.start(coreStart, { actions });
    return { start, coreStart, actions };
  };

  afterEach(async () => {
    await plugin.stop();
    getConnectorByIdMock.mockReset();
  });

  it("returns the connector of the feature's top endpoint", async () => {
    getConnectorByIdMock.mockResolvedValue(connector);
    const resolver = jest
      .fn()
      .mockResolvedValue({ connectorId: 'top', reasoning: { effort: 'low' }, temperature: 0.2 });
    const { start, coreStart, actions } = startPlugin(resolver);

    await expect(start.resolveFeatureConnector('my_feature', request)).resolves.toBe(connector);
    expect(resolver).toHaveBeenCalledWith('my_feature', request);
    expect(getConnectorByIdMock).toHaveBeenCalledTimes(1);
    expect(getConnectorByIdMock).toHaveBeenCalledWith({
      connectorId: 'top',
      actions,
      request,
      esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      logger: expect.anything(),
    });
    expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
  });

  it('rejects with a 400 request error when the feature has no endpoint', async () => {
    const resolver = jest.fn().mockResolvedValue(undefined);
    const { start } = startPlugin(resolver);

    await expect(start.resolveFeatureConnector('my_feature', request)).rejects.toMatchObject({
      code: InferenceTaskErrorCode.requestError,
      status: 400,
      message: expect.stringContaining('No endpoint is available for feature "my_feature"'),
    });
    expect(getConnectorByIdMock).not.toHaveBeenCalled();
  });

  it('rejects with an internal error when no resolver is registered', async () => {
    const { start } = startPlugin();

    await expect(start.resolveFeatureConnector('my_feature', request)).rejects.toMatchObject({
      code: InferenceTaskErrorCode.internalError,
      message: expect.stringContaining('no feature endpoint resolver is registered'),
    });
    expect(getConnectorByIdMock).not.toHaveBeenCalled();
  });
});
