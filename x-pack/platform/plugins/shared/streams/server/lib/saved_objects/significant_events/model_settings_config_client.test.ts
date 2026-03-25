/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
} from './model_settings_config';
import type { ModelSettingsConfigAttributes } from './model_settings_config';
import { ModelSettingsConfigClientImpl } from './model_settings_config_client';

const makeSoClient = (attributes: ModelSettingsConfigAttributes | null) => {
  const get = attributes
    ? jest.fn().mockResolvedValue({ attributes })
    : jest.fn().mockRejectedValue({ output: { statusCode: 404 } });

  return {
    get,
    create: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<SavedObjectsClientContract>;
};

const makeLogger = () =>
  ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger);

describe('ModelSettingsConfigClientImpl', () => {
  describe('getSettings()', () => {
    it('returns all undefined when SO does not exist', async () => {
      const client = new ModelSettingsConfigClientImpl(makeSoClient(null), makeLogger());

      const result = await client.getSettings();

      expect(result).toEqual({
        connectorIdKnowledgeIndicatorExtraction: undefined,
        connectorIdRuleGeneration: undefined,
        connectorIdDiscovery: undefined,
        indexPatterns: undefined,
      });
    });

    it('projects nested connectors to flat ModelSettings keys', async () => {
      const client = new ModelSettingsConfigClientImpl(
        makeSoClient({
          connectors: {
            kiFeatureExtractionConnector: { id: 'conn-a', source: 'user' },
            kiQueryGenerationConnector: { id: 'conn-b', source: 'system' },
            discoveryAndSigEventsConnector: { id: 'conn-c', source: 'system' },
          },
          indexPatterns: 'logs-*',
        }),
        makeLogger()
      );

      const result = await client.getSettings();

      expect(result).toEqual({
        connectorIdKnowledgeIndicatorExtraction: 'conn-a',
        connectorIdRuleGeneration: 'conn-b',
        connectorIdDiscovery: 'conn-c',
        indexPatterns: 'logs-*',
      });
    });

    it('returns undefined for slots absent from the nested connectors object', async () => {
      const client = new ModelSettingsConfigClientImpl(
        makeSoClient({
          connectors: {
            kiFeatureExtractionConnector: { id: 'conn-a', source: 'system' },
          },
          indexPatterns: undefined,
        }),
        makeLogger()
      );

      const result = await client.getSettings();

      expect(result.connectorIdKnowledgeIndicatorExtraction).toBe('conn-a');
      expect(result.connectorIdRuleGeneration).toBeUndefined();
      expect(result.connectorIdDiscovery).toBeUndefined();
    });
  });

  describe('updateSettings()', () => {
    it('injects source: user for each supplied connector field', async () => {
      const soClient = makeSoClient(null);
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      await client.updateSettings({
        connectorIdKnowledgeIndicatorExtraction: 'my-connector',
        connectorIdRuleGeneration: 'my-other-connector',
      });

      const written = (soClient.create as jest.Mock).mock
        .calls[0][1] as ModelSettingsConfigAttributes;
      expect(written.connectors?.kiFeatureExtractionConnector).toEqual({
        id: 'my-connector',
        source: 'user',
      });
      expect(written.connectors?.kiQueryGenerationConnector).toEqual({
        id: 'my-other-connector',
        source: 'user',
      });
    });

    it('does not include slots that were not supplied', async () => {
      const soClient = makeSoClient(null);
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      await client.updateSettings({ connectorIdKnowledgeIndicatorExtraction: 'my-connector' });

      const written = (soClient.create as jest.Mock).mock
        .calls[0][1] as ModelSettingsConfigAttributes;
      expect(written.connectors?.kiFeatureExtractionConnector).toEqual({
        id: 'my-connector',
        source: 'user',
      });
      expect(written.connectors?.kiQueryGenerationConnector).toBeUndefined();
      expect(written.connectors?.discoveryAndSigEventsConnector).toBeUndefined();
    });

    it('passes indexPatterns through without modification', async () => {
      const soClient = makeSoClient(null);
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      await client.updateSettings({ indexPatterns: 'metrics-*' });

      const written = (soClient.create as jest.Mock).mock
        .calls[0][1] as ModelSettingsConfigAttributes;
      expect(written.indexPatterns).toBe('metrics-*');
    });

    it('writes to the singleton SO id with overwrite: true', async () => {
      const soClient = makeSoClient(null);
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      await client.updateSettings({ connectorIdKnowledgeIndicatorExtraction: 'x' });

      expect(soClient.create).toHaveBeenCalledWith(
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
        expect.anything(),
        { id: STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID, overwrite: true }
      );
    });
  });

  describe('getRawAttributes() error handling', () => {
    it('returns null on 404 via output.statusCode', async () => {
      const soClient = {
        get: jest.fn().mockRejectedValue({ output: { statusCode: 404 } }),
        create: jest.fn(),
      } as unknown as SavedObjectsClientContract;
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      const result = await client.getSettings();

      expect(result.connectorIdKnowledgeIndicatorExtraction).toBeUndefined();
    });

    it('returns null on 404 via statusCode', async () => {
      const soClient = {
        get: jest.fn().mockRejectedValue({ statusCode: 404 }),
        create: jest.fn(),
      } as unknown as SavedObjectsClientContract;
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      const result = await client.getSettings();

      expect(result.connectorIdKnowledgeIndicatorExtraction).toBeUndefined();
    });

    it('rethrows non-404 errors', async () => {
      const soClient = {
        get: jest.fn().mockRejectedValue(new Error('ES cluster unavailable')),
        create: jest.fn(),
      } as unknown as SavedObjectsClientContract;
      const client = new ModelSettingsConfigClientImpl(soClient, makeLogger());

      await expect(client.getSettings()).rejects.toThrow('ES cluster unavailable');
    });
  });
});
