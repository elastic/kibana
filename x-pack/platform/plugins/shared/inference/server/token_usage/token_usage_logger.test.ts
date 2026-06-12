/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { TokenUsageLogger } from './token_usage_logger';

describe('TokenUsageLogger', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let tokenUsageLogger: TokenUsageLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    tokenUsageLogger = new TokenUsageLogger(logger);
    tokenUsageLogger.setEsClient(esClient);
  });

  const defaultTokens = {
    prompt: 100,
    completion: 50,
    total: 150,
  };

  const defaultContext = {
    connectorId: 'my-connector',
    featureId: 'observability_ai_assistant',
    parentFeatureId: 'observability',
    modelId: 'gpt-4',
    modelCreator: 'OpenAI',
    provider: 'Elastic',
  };

  describe('log', () => {
    it('should create the index template and data stream if they do not exist, then index the document', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(false);
      esClient.indices.putIndexTemplate.mockResolvedValue({} as any);
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.createDataStream.mockResolvedValue({} as any);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: defaultTokens,
        model: 'gpt-4-turbo',
        context: defaultContext,
      });

      expect(esClient.indices.existsIndexTemplate).toHaveBeenCalledWith({
        name: '.kibana-inference-token-usage-template',
      });
      expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '.kibana-inference-token-usage-template',
          index_patterns: ['.kibana-inference-token-usage'],
          data_stream: { hidden: true },
          template: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                '@timestamp': { type: 'date' },
                token_usage: expect.any(Object),
                model: expect.any(Object),
                inference: expect.any(Object),
              }),
            }),
          }),
        })
      );
      expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
        name: '.kibana-inference-token-usage',
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-inference-token-usage',
          op_type: 'create',
          document: expect.objectContaining({
            '@timestamp': expect.any(String),
            token_usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
            model: {
              model_id: 'gpt-4-turbo',
              model_creator: 'OpenAI',
              provider: 'Elastic',
            },
            inference: {
              connector_id: 'my-connector',
              feature_id: 'observability_ai_assistant',
              parent_feature_id: 'observability',
            },
          }),
        })
      );
    });

    it('should skip data stream creation if it already exists', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: defaultTokens,
        context: defaultContext,
      });

      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(esClient.index).toHaveBeenCalled();
    });

    it('should not check data stream existence again after it has been confirmed', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext });
      await tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext });

      expect(esClient.indices.existsIndexTemplate).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('should handle resource_already_exists_exception gracefully', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(false);
      esClient.indices.putIndexTemplate.mockResolvedValue({} as any);
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.createDataStream.mockRejectedValue({
        meta: { body: { error: { type: 'resource_already_exists_exception' } } },
      });
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext });

      expect(esClient.index).toHaveBeenCalled();
    });

    it('should use context modelId when model param is not provided', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: defaultTokens,
        context: defaultContext,
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            model: expect.objectContaining({
              model_id: 'gpt-4',
            }),
          }),
        })
      );
    });

    it('should store model_name from context', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: defaultTokens,
        context: { ...defaultContext, modelName: 'GPT-4 Turbo' },
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            model: expect.objectContaining({
              model_name: 'GPT-4 Turbo',
            }),
          }),
        })
      );
    });

    it('should prefer the model param over context modelId', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: defaultTokens,
        model: 'gpt-4-turbo',
        context: defaultContext,
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            model: expect.objectContaining({
              model_id: 'gpt-4-turbo',
            }),
          }),
        })
      );
    });

    it('should include optional token fields when present', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockResolvedValue({} as any);

      await tokenUsageLogger.log({
        tokens: { prompt: 100, completion: 50, thinking: 20, total: 170, cached: 30 },
        context: defaultContext,
      });

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            token_usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              thinking_tokens: 20,
              total_tokens: 170,
              cached_tokens: 30,
            },
          }),
        })
      );
    });

    it('should warn and skip logging when ES client is not initialized', async () => {
      const uninitializedLogger = new TokenUsageLogger(logger);

      await uninitializedLogger.log({
        tokens: defaultTokens,
        context: defaultContext,
      });

      expect(logger.get('token_usage').warn).toHaveBeenCalledWith(
        'Elasticsearch client not initialized, skipping token usage logging'
      );
    });

    it('should reset dataStreamReady when index is not found, allowing re-creation on next call', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockRejectedValueOnce({ meta: { statusCode: 404 } });
      esClient.index.mockResolvedValueOnce({} as any);

      // First call: index exists check passes, but write fails with 404
      await tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext });

      // Second call: should re-check index existence and succeed
      await tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext });

      expect(esClient.indices.existsIndexTemplate).toHaveBeenCalledTimes(2);
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('should log an error and not throw when indexing fails', async () => {
      esClient.indices.existsIndexTemplate.mockResolvedValue(true);
      esClient.indices.exists.mockResolvedValue(true);
      esClient.index.mockRejectedValue(new Error('index write failed'));

      await expect(
        tokenUsageLogger.log({ tokens: defaultTokens, context: defaultContext })
      ).resolves.toBeUndefined();

      expect(logger.get('token_usage').error).toHaveBeenCalledWith(
        'Failed to log token usage: index write failed'
      );
    });
  });
});
