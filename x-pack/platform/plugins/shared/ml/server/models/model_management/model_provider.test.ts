/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelsProvider } from './models_provider';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type { MlClient } from '../../lib/ml_client';
import downloadTasksResponse from './__mocks__/mock_download_tasks.json';
import type { MlFeatures } from '../../../common/constants/app';
import { mlLog } from '../../lib/log';
import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ExistingModelBase } from '../../../common/types/trained_models';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

jest.mock('../../lib/log');

describe('modelsProvider', () => {
  const mockClient = elasticsearchClientMock.createScopedClusterClient();

  mockClient.asInternalUser.transport.request.mockResolvedValue({
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
  });

  mockClient.asInternalUser.tasks.list.mockResolvedValue({ tasks: [] });

  const mockMlClient = {} as unknown as jest.Mocked<MlClient>;

  const mockCloud = cloudMock.createSetup();

  const enabledMlFeatures: MlFeatures = {
    ad: false,
    dfa: true,
    nlp: true,
  };

  const modelService = modelsProvider(mockClient, mockMlClient, mockCloud, enabledMlFeatures);

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
          supported: false,
          model_id: '.elser_model_1',
          version: 1,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          default: true,
          supported: true,
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
          supported: true,
          version: 2,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
          disclaimer:
            'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
          model_id: '.multilingual-e5-small',
          default: true,
          supported: true,
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
          disclaimer:
            'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
          model_id: '.multilingual-e5-small_linux-x86_64',
          os: 'Linux',
          recommended: true,
          supported: true,
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
      mockClient.asInternalUser.transport.request.mockResolvedValueOnce({
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
          supported: false,
          model_id: '.elser_model_1',
          version: 1,
          modelName: 'elser',
          type: ['elastic', 'pytorch', 'text_expansion'],
        },
        {
          config: { input: { field_names: ['text_field'] } },
          recommended: true,
          supported: true,
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
          supported: false,
        },
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'E5 (EmbEddings from bidirEctional Encoder rEpresentations)',
          disclaimer:
            'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
          model_id: '.multilingual-e5-small',
          recommended: true,
          supported: true,
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
          disclaimer:
            'This E5 model, as defined, hosted, integrated and used in conjunction with our other Elastic Software is covered by our standard warranty.',
          model_id: '.multilingual-e5-small_linux-x86_64',
          os: 'Linux',
          supported: false,
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
      mockClient.asInternalUser.transport.request.mockResolvedValueOnce({
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
      mockClient.asInternalUser.transport.request.mockResolvedValueOnce({
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

  describe('getModelsDownloadStatus', () => {
    test('returns null if no model download is in progress', async () => {
      const result = await modelService.getModelsDownloadStatus();
      expect(result).toEqual({});
    });
    test('provides download status for all models', async () => {
      mockClient.asInternalUser.tasks.list.mockResolvedValueOnce(downloadTasksResponse);
      const result = await modelService.getModelsDownloadStatus();
      expect(result).toEqual({
        '.elser_model_2': { downloaded_parts: 0, total_parts: 418 },
        '.elser_model_2_linux-x86_64': { downloaded_parts: 96, total_parts: 263 },
      });
    });
  });

  describe('#assignInferenceEndpoints', () => {
    let trainedModels: ExistingModelBase[];

    const inferenceServices = [
      {
        service: 'elser',
        model_id: 'elser_test',
        service_settings: { model_id: '.elser_model_2' },
      },
      { service: 'open_api_01', service_settings: {} },
    ] as InferenceInferenceEndpointInfo[];

    beforeEach(() => {
      trainedModels = [
        { model_id: '.elser_model_2' },
        { model_id: 'model2' },
      ] as ExistingModelBase[];

      mockClient.asInternalUser.inference.get.mockResolvedValue({
        endpoints: inferenceServices,
      });

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when the user has required privileges', () => {
      beforeEach(() => {
        mockClient.asCurrentUser.inference.get.mockResolvedValue({
          endpoints: inferenceServices,
        });
      });

      test('should populate inference services for trained models', async () => {
        // act
        await modelService.assignInferenceEndpoints(trainedModels, false);

        // assert
        expect(mockClient.asCurrentUser.inference.get).toHaveBeenCalledWith({
          inference_id: '_all',
        });

        expect(mockClient.asInternalUser.inference.get).not.toHaveBeenCalled();

        expect(trainedModels[0].inference_apis).toEqual([
          {
            model_id: 'elser_test',
            service: 'elser',
            service_settings: { model_id: '.elser_model_2' },
          },
        ]);
        expect(trainedModels[0].hasInferenceServices).toBe(true);

        expect(trainedModels[1].inference_apis).toEqual(undefined);
        expect(trainedModels[1].hasInferenceServices).toBe(false);

        expect(mlLog.error).not.toHaveBeenCalled();
      });
    });

    describe('when the user does not have required privileges', () => {
      beforeEach(() => {
        mockClient.asCurrentUser.inference.get.mockRejectedValue(
          new errors.ResponseError(
            elasticsearchClientMock.createApiResponse({
              statusCode: 403,
              body: { message: 'not allowed' },
            })
          )
        );
      });

      test('should retry with internal user if an error occurs', async () => {
        await modelService.assignInferenceEndpoints(trainedModels, false);

        // assert
        expect(mockClient.asCurrentUser.inference.get).toHaveBeenCalledWith({
          inference_id: '_all',
        });

        expect(mockClient.asInternalUser.inference.get).toHaveBeenCalledWith({
          inference_id: '_all',
        });

        expect(trainedModels[0].inference_apis).toEqual(undefined);
        expect(trainedModels[0].hasInferenceServices).toBe(true);

        expect(trainedModels[1].inference_apis).toEqual(undefined);
        expect(trainedModels[1].hasInferenceServices).toBe(false);

        expect(mlLog.error).not.toHaveBeenCalled();
      });
    });

    test('should not retry on any other error than 403', async () => {
      const notFoundError = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 404,
          body: { message: 'not found' },
        })
      );

      mockClient.asCurrentUser.inference.get.mockRejectedValue(notFoundError);

      await modelService.assignInferenceEndpoints(trainedModels, false);

      // assert
      expect(mockClient.asCurrentUser.inference.get).toHaveBeenCalledWith({
        inference_id: '_all',
      });

      expect(mockClient.asInternalUser.inference.get).not.toHaveBeenCalled();

      expect(mlLog.error).toHaveBeenCalledWith(notFoundError);
    });
  });
});
