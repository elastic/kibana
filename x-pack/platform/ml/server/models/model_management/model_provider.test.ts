/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelsProvider } from './models_provider';
import { type IScopedClusterClient } from '@kbn/core/server';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type { MlClient } from '../../lib/ml_client';

describe('modelsProvider', () => {
  const mockClient = {
    asInternalUser: {
      transport: {
        request: jest.fn().mockResolvedValue({
          _nodes: {
            total: 1,
            successful: 1,
            failed: 0,
          },
          cluster_name: 'default',
          nodes: {
            yYmqBqjpQG2rXsmMSPb9pQ: {
              name: 'node-0',
              roles: ['ml'],
              attributes: {},
              os: {
                name: 'Linux',
                arch: 'amd64',
              },
            },
          },
        }),
      },
    },
  } as unknown as jest.Mocked<IScopedClusterClient>;

  const mockMlClient = {} as unknown as jest.Mocked<MlClient>;

  const mockCloud = cloudMock.createSetup();
  const modelService = modelsProvider(mockClient, mockMlClient, mockCloud);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getModelDownloads', () => {
    test('provides a list of models with recommended and default flag', async () => {
      const result = await modelService.getModelDownloads();
      expect(result).toEqual([
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
          hidden: true,
          model_id: '.elser_model_1',
          version: 1,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          default: true,
          description: 'Elastic Learned Sparse EncodeR v2',
          model_id: '.elser_model_2',
          version: 2,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64',
          model_id: '.elser_model_2_linux-x86_64',
          os: 'Linux',
          recommended: true,
          version: 2,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
          model_id: '.multilingual-e5-small',
          default: true,
          version: 1,
          modelName: 'e5',
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small',
          type: ['pytorch', 'text_embedding'],
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description:
            'E5 (EmbEddings from bidirEctional Encoder rEpresentations), optimized for linux-x86_64',
          model_id: '.multilingual-e5-small_linux-x86_64',
          os: 'Linux',
          recommended: true,
          version: 1,
          modelName: 'e5',
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small_linux-x86_64',
          type: ['pytorch', 'text_embedding'],
        },
      ]);
    });

    test('provides a list of models with default model as recommended', async () => {
      mockCloud.cloudId = undefined;
      (mockClient.asInternalUser.transport.request as jest.Mock).mockResolvedValueOnce({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        cluster_name: 'default',
        nodes: {
          yYmqBqjpQG2rXsmMSPb9pQ: {
            name: 'node-0',
            roles: ['ml'],
            attributes: {},
            os: {
              name: 'Mac OS X',
              arch: 'aarch64',
            },
          },
        },
      });

      const result = await modelService.getModelDownloads();

      expect(result).toEqual([
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
          hidden: true,
          model_id: '.elser_model_1',
          version: 1,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          recommended: true,
          description: 'Elastic Learned Sparse EncodeR v2',
          model_id: '.elser_model_2',
          version: 2,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64',
          model_id: '.elser_model_2_linux-x86_64',
          os: 'Linux',
          version: 2,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
          model_id: '.multilingual-e5-small',
          recommended: true,
          version: 1,
          modelName: 'e5',
          type: ['pytorch', 'text_embedding'],
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small',
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description:
            'E5 (EmbEddings from bidirEctional Encoder rEpresentations), optimized for linux-x86_64',
          model_id: '.multilingual-e5-small_linux-x86_64',
          os: 'Linux',
          version: 1,
          modelName: 'e5',
          type: ['pytorch', 'text_embedding'],
          license: 'MIT',
          licenseUrl: 'https://huggingface.co/elastic/multilingual-e5-small_linux-x86_64',
        },
      ]);
    });
  });

  describe('getELSER', () => {
    test('provides a recommended definition by default', async () => {
      const result = await modelService.getELSER();
      expect(result.model_id).toEqual('.elser_model_2_linux-x86_64');
    });

    test('provides a default version if there is no recommended', async () => {
      mockCloud.cloudId = undefined;
      (mockClient.asInternalUser.transport.request as jest.Mock).mockResolvedValueOnce({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        cluster_name: 'default',
        nodes: {
          yYmqBqjpQG2rXsmMSPb9pQ: {
            name: 'node-0',
            roles: ['ml'],
            attributes: {},
            os: {
              name: 'Mac OS X',
              arch: 'aarch64',
            },
          },
        },
      });

      const result = await modelService.getELSER();
      expect(result.model_id).toEqual('.elser_model_2');
    });

    test('provides the requested version', async () => {
      const result = await modelService.getELSER({ version: 1 });
      expect(result.model_id).toEqual('.elser_model_1');
    });

    test('provides the requested version of a recommended architecture', async () => {
      const result = await modelService.getELSER({ version: 2 });
      expect(result.model_id).toEqual('.elser_model_2_linux-x86_64');
    });
  });

  describe('getCuratedModelConfig', () => {
    test('provides a recommended definition by default', async () => {
      const result = await modelService.getCuratedModelConfig('e5');
      expect(result.model_id).toEqual('.multilingual-e5-small_linux-x86_64');
    });

    test('provides a default version if there is no recommended', async () => {
      mockCloud.cloudId = undefined;
      (mockClient.asInternalUser.transport.request as jest.Mock).mockResolvedValueOnce({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        cluster_name: 'default',
        nodes: {
          yYmqBqjpQG2rXsmMSPb9pQ: {
            name: 'node-0',
            roles: ['ml'],
            attributes: {},
            os: {
              name: 'Mac OS X',
              arch: 'aarch64',
            },
          },
        },
      });

      const result = await modelService.getCuratedModelConfig('e5');
      expect(result.model_id).toEqual('.multilingual-e5-small');
    });
  });
});
