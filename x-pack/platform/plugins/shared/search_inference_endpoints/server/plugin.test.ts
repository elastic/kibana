/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { InferenceTaskErrorCode } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { SearchInferenceEndpointsPlugin } from './plugin';
import {
  ELASTIC_INFERENCE_SERVICE_APP_ID,
  INFERENCE_ENDPOINTS_APP_ID,
  INFERENCE_SETTINGS_SO_TYPE,
  MODEL_SETTINGS_APP_ID,
  PLUGIN_ID,
  PLUGIN_NAME,
} from '../common/constants';
import type { SearchInferenceEndpointsConfig } from './config';

describe('SearchInferenceEndpointsPlugin', () => {
  let plugin: SearchInferenceEndpointsPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let features: ReturnType<typeof featuresPluginMock.createSetup>;
  let inferenceSetup: ReturnType<typeof inferenceMock.createSetupContract>;

  beforeEach(() => {
    const context = coreMock.createPluginInitializerContext<SearchInferenceEndpointsConfig>({
      enabled: true,
      ui: { enabled: true },
    });
    plugin = new SearchInferenceEndpointsPlugin(context);
    coreSetup = coreMock.createSetup();
    features = featuresPluginMock.createSetup();
    inferenceSetup = inferenceMock.createSetupContract();
  });

  describe('setup()', () => {
    it('registers routes', () => {
      plugin.setup(coreSetup, { features, inference: inferenceSetup });

      expect(coreSetup.http.createRouter).toHaveBeenCalledTimes(1);
    });

    it('registers the kibana feature with correct properties', () => {
      plugin.setup(coreSetup, { features, inference: inferenceSetup });

      expect(features.registerKibanaFeature).toHaveBeenCalledTimes(1);

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature).toMatchObject({
        id: PLUGIN_ID,
        name: PLUGIN_NAME,
        minimumLicense: 'enterprise',
        category: DEFAULT_APP_CATEGORIES.management,
        management: {
          modelManagement: [
            ELASTIC_INFERENCE_SERVICE_APP_ID,
            INFERENCE_ENDPOINTS_APP_ID,
            MODEL_SETTINGS_APP_ID,
          ],
        },
      });
    });

    it('registers feature with all privilege granting management access', () => {
      plugin.setup(coreSetup, { features, inference: inferenceSetup });

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature.privileges?.all).toMatchObject({
        management: {
          modelManagement: [
            ELASTIC_INFERENCE_SERVICE_APP_ID,
            INFERENCE_ENDPOINTS_APP_ID,
            MODEL_SETTINGS_APP_ID,
          ],
        },
      });
    });

    it('registers feature with read privilege enabled', () => {
      plugin.setup(coreSetup, { features, inference: inferenceSetup });

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature.privileges?.read).toMatchObject({
        savedObject: { all: [], read: ['inference-settings'] },
        ui: ['show'],
      });
      expect(feature.privileges?.read).not.toHaveProperty('disabled');
    });

    describe('feature endpoint resolver', () => {
      const request = httpServerMock.createKibanaRequest();
      const getFeature = jest.fn();
      const getForFeature = jest.fn();
      const getUiSetting = jest.fn();
      const getConnectorById = jest.fn();

      const setupAndGetResolver = async () => {
        const setupWithStart = coreMock.createSetup({
          pluginStartDeps: { inference: { getConnectorById } },
          pluginStartContract: {
            features: { get: getFeature },
            endpoints: { getForFeature },
          },
        });
        const [coreStart] = await setupWithStart.getStartServices();
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
          savedObjectsClientMock.create()
        );
        jest.mocked(uiSettingsClient.get).mockImplementation(getUiSetting);
        plugin.setup(setupWithStart, { features, inference: inferenceSetup });
        return inferenceSetup.registerFeatureEndpointResolver.mock.calls[0][0];
      };

      beforeEach(() => {
        getFeature.mockReset();
        getForFeature.mockReset();
        getUiSetting.mockReset();
        getConnectorById.mockReset();
      });

      it('registers a resolver with the inference plugin', async () => {
        await setupAndGetResolver();

        expect(inferenceSetup.registerFeatureEndpointResolver).toHaveBeenCalledTimes(1);
      });

      it('returns the call options of the top endpoint', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [
            { connectorId: 'top', parameters: { reasoning: { effort: 'low' } } },
            { connectorId: 'second', parameters: { reasoning: { effort: 'high' } } },
          ],
          soEntryFound: true,
        });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toEqual({
          connectorId: 'top',
          reasoning: { effort: 'low' },
        });
        expect(getForFeature).toHaveBeenCalledWith('my_feature', request);
      });

      it('returns the top endpoint when it is recommended for the feature', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'recommended', isRecommended: true }],
          soEntryFound: false,
        });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toEqual({
          connectorId: 'recommended',
          reasoning: undefined,
        });
      });

      it('returns the top endpoint when it is the global default connector', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'global-default' }, { connectorId: 'other' }],
          soEntryFound: false,
        });
        getUiSetting.mockResolvedValue('global-default');
        getConnectorById.mockResolvedValue({ connectorId: 'global-default' });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toEqual({
          connectorId: 'global-default',
          reasoning: undefined,
        });
        expect(getUiSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
        expect(getConnectorById).toHaveBeenCalledWith('global-default', request);
      });

      it('returns the top endpoint when the global default is a stack connector alias for it', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'my-inference-endpoint' }],
          soEntryFound: false,
        });
        getUiSetting.mockResolvedValue('my-stack-connector');
        getConnectorById.mockResolvedValue({ connectorId: 'my-inference-endpoint' });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toEqual({
          connectorId: 'my-inference-endpoint',
          reasoning: undefined,
        });
      });

      it('returns undefined when the global default connector cannot be loaded', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'first-in-catalog' }],
          soEntryFound: false,
        });
        getUiSetting.mockResolvedValue('missing-connector');
        getConnectorById.mockRejectedValue(new Error('not found'));
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toBeUndefined();
      });

      it('returns undefined when only the connector catalog is available', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'first-in-catalog' }, { connectorId: 'other' }],
          soEntryFound: false,
        });
        getUiSetting.mockResolvedValue('NO_DEFAULT_CONNECTOR');
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toBeUndefined();
        expect(getConnectorById).not.toHaveBeenCalled();
      });

      it('returns undefined when the feature has no endpoints', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'chat_completion' });
        getForFeature.mockResolvedValue({ endpoints: [] });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).resolves.toBeUndefined();
      });

      it('throws when the feature is not registered', async () => {
        getFeature.mockReturnValue(undefined);
        const resolver = await setupAndGetResolver();

        await expect(resolver('unknown', request)).rejects.toMatchObject({
          code: InferenceTaskErrorCode.requestError,
          message: 'Feature "unknown" is not registered',
          meta: { status: 400 },
        });
        expect(getForFeature).not.toHaveBeenCalled();
      });

      it('throws when the feature is not a chat completion feature', async () => {
        getFeature.mockReturnValue({ featureId: 'my_feature', taskType: 'text_embedding' });
        const resolver = await setupAndGetResolver();

        await expect(resolver('my_feature', request)).rejects.toMatchObject({
          code: InferenceTaskErrorCode.requestError,
          message:
            'Feature "my_feature" is not a chat completion feature (task type "text_embedding")',
          meta: { status: 400 },
        });
        expect(getForFeature).not.toHaveBeenCalled();
      });
    });
  });

  describe('start()', () => {
    let coreStart: ReturnType<typeof coreMock.createStart>;
    let startContract: ReturnType<SearchInferenceEndpointsPlugin['start']>;

    beforeEach(() => {
      coreStart = coreMock.createStart();
      plugin.setup(coreSetup, { features, inference: inferenceSetup });

      const inference = inferenceMock.createStartContract();
      inference.getConnectorList.mockResolvedValue([]);
      inference.getConnectorById.mockRejectedValue(new Error('not found'));

      startContract = plugin.start(coreStart, { inference });
    });

    it('endpoints.getForFeature reads inference settings with the internal client', async () => {
      const request = httpServerMock.createKibanaRequest();
      await startContract.endpoints.getForFeature('any_feature', request);

      expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
        includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
      });
    });

    it('scopes the internal settings client to the namespace of the request', async () => {
      const request = httpServerMock.createKibanaRequest();
      const scopedClient = savedObjectsClientMock.create();
      scopedClient.getCurrentNamespace.mockReturnValue('applications');
      coreStart.savedObjects.getScopedClient.mockReturnValue(scopedClient);

      const internalClient = savedObjectsClientMock.create();
      const spaceScopedClient = savedObjectsClientMock.create();
      internalClient.asScopedToNamespace.mockReturnValue(spaceScopedClient);
      coreStart.savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);

      await startContract.endpoints.getForFeature('any_feature', request);

      expect(internalClient.asScopedToNamespace).toHaveBeenCalledWith('applications');
      expect(spaceScopedClient.get).toHaveBeenCalledWith(INFERENCE_SETTINGS_SO_TYPE, 'default');
      expect(internalClient.get).not.toHaveBeenCalled();
    });

    it('does not scope the internal settings client when the request is in the default space', async () => {
      const request = httpServerMock.createKibanaRequest();
      const internalClient = savedObjectsClientMock.create();
      coreStart.savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);

      await startContract.endpoints.getForFeature('any_feature', request);

      expect(internalClient.asScopedToNamespace).not.toHaveBeenCalled();
      expect(internalClient.get).toHaveBeenCalledWith(INFERENCE_SETTINGS_SO_TYPE, 'default');
    });

    it('applies the admin-configured model list to users who cannot read the settings saved object', async () => {
      const request = httpServerMock.createKibanaRequest();
      const scopedClient = savedObjectsClientMock.create();
      scopedClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(
          new Error(`Unable to get ${INFERENCE_SETTINGS_SO_TYPE}`)
        )
      );
      coreStart.savedObjects.getScopedClient.mockReturnValue(scopedClient);

      const internalClient = savedObjectsClientMock.create();
      internalClient.get.mockResolvedValue({
        id: 'default',
        type: INFERENCE_SETTINGS_SO_TYPE,
        references: [],
        attributes: { features: [{ feature_id: 'any_feature', endpoints: [{ id: 'allowed' }] }] },
      });
      coreStart.savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);

      const createConnector = (connectorId: string) => ({
        connectorId,
        name: connectorId,
        type: '.gen-ai',
        config: {},
        capabilities: {},
        isPreconfigured: false,
        isInferenceEndpoint: false,
      });
      const inference = inferenceMock.createStartContract();
      inference.getConnectorList.mockResolvedValue([
        createConnector('allowed'),
        createConnector('hidden'),
      ] as any);
      inference.getConnectorById.mockImplementation(
        async (id: string) => createConnector(id) as any
      );

      const contract = plugin.start(coreStart, { inference });
      contract.features.register({
        featureId: 'any_feature',
        featureName: 'Any feature',
        featureDescription: 'Any feature',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
      });
      const result = await contract.endpoints.getForFeature('any_feature', request);

      expect(result.soEntryFound).toBe(true);
      expect(result.endpoints.map((e) => e.connectorId)).toEqual(['allowed']);
    });

    it('creates a separate scoped SO client per request, ensuring space isolation', async () => {
      const requestA = httpServerMock.createKibanaRequest();
      const requestB = httpServerMock.createKibanaRequest();

      await startContract.endpoints.getForFeature('any_feature', requestA);
      await startContract.endpoints.getForFeature('any_feature', requestB);

      const calls = coreStart.savedObjects.getScopedClient.mock.calls;
      const requestsUsed = calls.map(([req]) => req);

      expect(requestsUsed).toContain(requestA);
      expect(requestsUsed).toContain(requestB);
    });

    describe('getForFeature with onlyReturnConfigured', () => {
      it('returns empty list when no SO entry and no recommended endpoints', async () => {
        const request = httpServerMock.createKibanaRequest();
        const result = await startContract.endpoints.getForFeature('any_feature', request, {
          onlyReturnConfigured: true,
        });
        expect(result).toEqual({ endpoints: [], warnings: [], soEntryFound: false });
      });

      it('enforces defaultConnectorOnly policy: returns only the admin default connector', async () => {
        const request = httpServerMock.createKibanaRequest();
        const defaultConnector = {
          connectorId: 'admin-default',
          name: 'admin-default',
          type: '.gen-ai',
          config: {},
          capabilities: {},
          isPreconfigured: false,
          isInferenceEndpoint: false,
        };

        // Configure uiSettings to indicate defaultConnectorOnly is enabled
        const uiSettingsScoped = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'admin-default';
            return undefined;
          }),
        };
        coreStart.uiSettings.asScopedToClient.mockReturnValue(uiSettingsScoped as any);

        const inference = inferenceMock.createStartContract();
        inference.getConnectorList.mockResolvedValue([]);
        inference.getConnectorById.mockResolvedValue(defaultConnector as any);

        const contractWithDefaultOnly = plugin.start(coreStart, { inference });

        const result = await contractWithDefaultOnly.endpoints.getForFeature(
          'any_feature',
          request,
          { onlyReturnConfigured: true }
        );
        expect(result).toEqual({
          endpoints: [defaultConnector],
          warnings: [],
          soEntryFound: false,
        });
      });

      it('returns nothing for a registered feature with no saved row and no recommended endpoints', async () => {
        const request = httpServerMock.createKibanaRequest();
        startContract.features.register({
          featureId: 'child_feature',
          featureName: 'Child',
          featureDescription: 'Child',
          taskType: 'chat_completion',
          recommendedEndpoints: [],
        });

        const result = await startContract.endpoints.getForFeature('child_feature', request, {
          onlyReturnConfigured: true,
        });

        expect(result).toEqual({ endpoints: [], warnings: [], soEntryFound: false });
      });

      it('returns empty list when defaultConnectorOnly is set but no default connector is configured', async () => {
        const request = httpServerMock.createKibanaRequest();

        const uiSettingsScoped = {
          get: jest.fn().mockImplementation((key: string) => {
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) return true;
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return 'NO_DEFAULT_CONNECTOR';
            return undefined;
          }),
        };
        coreStart.uiSettings.asScopedToClient.mockReturnValue(uiSettingsScoped as any);

        const inference = inferenceMock.createStartContract();
        inference.getConnectorList.mockResolvedValue([]);
        inference.getConnectorById.mockRejectedValue(new Error('not found'));

        const contractWithDefaultOnly = plugin.start(coreStart, { inference });

        const result = await contractWithDefaultOnly.endpoints.getForFeature(
          'any_feature',
          request,
          { onlyReturnConfigured: true }
        );
        expect(result).toEqual({ endpoints: [], warnings: [], soEntryFound: false });
      });
    });
  });
});
