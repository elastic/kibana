/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSelectedConnectorId } from './resolve_selected_connector_id';
import {
  type InferenceConnector,
  defaultInferenceEndpoints,
  InferenceConnectorType,
} from '@kbn/inference-common';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const createSearchInferenceEndpointsMock = (
  overrides: Partial<{
    endpoints: InferenceConnector[];
    soEntryFound: boolean;
    error: Error;
  }> = {}
) => {
  const mock: SearchInferenceEndpointsPluginStart = {
    features: {} as any,
    endpoints: {
      getForFeature: overrides.error
        ? jest.fn().mockRejectedValue(overrides.error)
        : jest.fn().mockResolvedValue({
            endpoints: overrides.endpoints ?? [],
            warnings: [],
            soEntryFound: overrides.soEntryFound ?? false,
          }),
    },
  };
  return mock;
};

const setupCoreMocks = (values: Record<string, any>) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const request = httpServerMock.createKibanaRequest();

  const soClient = {} as any;
  savedObjects.getScopedClient.mockReturnValue(soClient);

  const get = jest.fn(async (key: string) => values[key]);
  uiSettings.asScopedToClient.mockReturnValue({ get } as any);

  return { savedObjects, uiSettings, request };
};

const noDefaultSettings = {
  [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
  [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
};

describe('resolveSelectedConnectorId', () => {
  describe('ui settings checks', () => {
    it('throws when defaultOnly=true and explicit connectorId does not match default', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks({
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
      });
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      await expect(
        resolveSelectedConnectorId({
          uiSettings,
          savedObjects,
          request,
          connectorId: 'explicit-id',
          inference,
          searchInferenceEndpoints,
        })
      ).rejects.toThrow(
        'Connector ID [explicit-id] does not match the configured default connector ID [default-id].'
      );
    });

    it('returns default connector when defaultOnly=true and explicit connectorId matches default', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks({
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
      });
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        connectorId: 'default-id',
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('default-id');
    });

    it('returns explicit connectorId when provided and defaultOnly=false', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks({
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
      });
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        connectorId: 'explicit-id',
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('explicit-id');
    });

    it('returns default connector setting when no explicit connectorId and defaultOnly=false', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks({
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
        [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
      });
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('default-id');
    });
  });

  describe('feature endpoint fallback', () => {
    it('returns the first feature endpoint when available', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock({
        endpoints: [
          { connectorId: 'recommended-1' } as InferenceConnector,
          { connectorId: 'recommended-2' } as InferenceConnector,
        ],
      });

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('recommended-1');
      expect(inference.getConnectorList).not.toHaveBeenCalled();
    });

    it('returns the first SO-configured endpoint when soEntryFound is true', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock({
        soEntryFound: true,
        endpoints: [{ connectorId: 'admin-configured' } as InferenceConnector],
      });

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('admin-configured');
      expect(inference.getConnectorList).not.toHaveBeenCalled();
    });
  });

  describe('connector list fallback', () => {
    it('prefers KIBANA_DEFAULT_CHAT_COMPLETION from connector list', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();
      const kibanaDefault = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;

      (inference.getConnectorList as jest.Mock).mockResolvedValue([
        { connectorId: 'other-id' } as InferenceConnector,
        { connectorId: kibanaDefault } as InferenceConnector,
      ]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe(kibanaDefault);
    });

    it('prefers Inference connector type when KIBANA_DEFAULT_CHAT_COMPLETION is not available', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      (inference.getConnectorList as jest.Mock).mockResolvedValue([
        { connectorId: 'openai-id', type: InferenceConnectorType.OpenAI } as InferenceConnector,
        {
          connectorId: 'inference-id',
          type: InferenceConnectorType.Inference,
        } as InferenceConnector,
        { connectorId: 'gemini-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
      ]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('inference-id');
    });

    it('prefers OpenAI connector type when neither default nor Inference are available', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      (inference.getConnectorList as jest.Mock).mockResolvedValue([
        { connectorId: 'gemini-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
        { connectorId: 'openai-id', type: InferenceConnectorType.OpenAI } as InferenceConnector,
      ]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('openai-id');
    });

    it('falls back to first connector when no preferred types are available', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      (inference.getConnectorList as jest.Mock).mockResolvedValue([
        { connectorId: 'gemini-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
        { connectorId: 'bedrock-id', type: InferenceConnectorType.Bedrock } as InferenceConnector,
      ]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe('gemini-id');
    });

    it('returns undefined when no connectors are available', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock();

      (inference.getConnectorList as jest.Mock).mockResolvedValue([]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBeUndefined();
    });

    it('falls back to connector list when getForFeature throws', async () => {
      const { savedObjects, uiSettings, request } = setupCoreMocks(noDefaultSettings);
      const inference = inferenceMock.createStartContract();
      const searchInferenceEndpoints = createSearchInferenceEndpointsMock({
        error: new Error('feature resolution failed'),
      });
      const kibanaDefault = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;

      (inference.getConnectorList as jest.Mock).mockResolvedValue([
        { connectorId: kibanaDefault } as InferenceConnector,
      ]);

      const result = await resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        inference,
        searchInferenceEndpoints,
      });

      expect(result).toBe(kibanaDefault);
    });
  });
});
