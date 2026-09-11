/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
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

  beforeEach(() => {
    const context = coreMock.createPluginInitializerContext<SearchInferenceEndpointsConfig>({
      enabled: true,
      ui: { enabled: true },
      dynamicConnectors: { enabled: false, pollingIntervalMins: 15 },
    });
    plugin = new SearchInferenceEndpointsPlugin(context);
    coreSetup = coreMock.createSetup();
    features = featuresPluginMock.createSetup();
  });

  describe('setup()', () => {
    it('registers routes', () => {
      plugin.setup(coreSetup, { features });

      expect(coreSetup.http.createRouter).toHaveBeenCalledTimes(1);
    });

    it('registers the kibana feature with correct properties', () => {
      plugin.setup(coreSetup, { features });

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
      plugin.setup(coreSetup, { features });

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
      plugin.setup(coreSetup, { features });

      const feature = features.registerKibanaFeature.mock.calls[0][0];

      expect(feature.privileges?.read).toMatchObject({
        savedObject: { all: [], read: ['inference-settings'] },
        ui: ['show'],
      });
      expect(feature.privileges?.read).not.toHaveProperty('disabled');
    });
  });

  describe('start()', () => {
    let coreStart: ReturnType<typeof coreMock.createStart>;
    let startContract: ReturnType<SearchInferenceEndpointsPlugin['start']>;

    beforeEach(() => {
      coreStart = coreMock.createStart();
      plugin.setup(coreSetup, { features });

      const inference = inferenceMock.createStartContract();
      inference.getConnectorList.mockResolvedValue([]);
      inference.getConnectorById.mockRejectedValue(new Error('not found'));

      startContract = plugin.start(coreStart, {
        actions: actionsMock.createStart(),
        inference,
      });
    });

    it('endpoints.getForFeature reads inference settings with getScopedClient', async () => {
      const request = httpServerMock.createKibanaRequest();
      await startContract.endpoints.getForFeature('any_feature', request);

      expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
        includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
      });
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

        const contractWithDefaultOnly = plugin.start(coreStart, {
          actions: actionsMock.createStart(),
          inference,
        });

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

        const contractWithDefaultOnly = plugin.start(coreStart, {
          actions: actionsMock.createStart(),
          inference,
        });

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
