/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterSupportedConnectors,
  INFERENCE_CONNECTOR_TYPE,
  type ConnectorWithConfig,
} from './route';

describe('filterSupportedConnectors', () => {
  const createConnector = (
    overrides: Partial<ConnectorWithConfig> & Pick<ConnectorWithConfig, 'id' | 'actionTypeId'>
  ): ConnectorWithConfig => ({
    name: `Connector ${overrides.id}`,
    ...overrides,
  });

  describe('connector type filtering', () => {
    it('includes supported connector types (OpenAI, Bedrock, Gemini)', async () => {
      const connectors = [
        createConnector({ id: 'openai-1', actionTypeId: '.gen-ai' }),
        createConnector({ id: 'bedrock-1', actionTypeId: '.bedrock' }),
        createConnector({ id: 'gemini-1', actionTypeId: '.gemini' }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(['openai-1', 'bedrock-1', 'gemini-1']);
      // Non-inference connectors shouldn't trigger endpoint check
      expect(mockCheckEndpoint).not.toHaveBeenCalled();
    });

    it('filters out unsupported connector types', async () => {
      const connectors = [
        createConnector({ id: 'openai-1', actionTypeId: '.gen-ai' }),
        createConnector({ id: 'slack-1', actionTypeId: '.slack' }),
        createConnector({ id: 'email-1', actionTypeId: '.email' }),
        createConnector({ id: 'webhook-1', actionTypeId: '.webhook' }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('openai-1');
    });
  });

  describe('inference connector filtering', () => {
    it('includes .inference connectors with taskType chat_completion', async () => {
      const connectors = [
        createConnector({
          id: 'inference-1',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion', inferenceId: 'my-endpoint' },
        }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inference-1');
    });

    it('filters out .inference connectors with wrong taskType', async () => {
      const connectors = [
        createConnector({
          id: 'inference-embed',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'text_embedding', inferenceId: 'embed-endpoint' },
        }),
        createConnector({
          id: 'inference-sparse',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'sparse_embedding', inferenceId: 'sparse-endpoint' },
        }),
        createConnector({
          id: 'inference-chat',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion', inferenceId: 'chat-endpoint' },
        }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      // Only chat_completion taskType should pass
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inference-chat');
    });

    it('filters out .inference connectors without taskType', async () => {
      const connectors = [
        createConnector({
          id: 'inference-no-task',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { inferenceId: 'some-endpoint' },
        }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(0);
    });
  });

  describe('inference endpoint validation', () => {
    it('filters out .inference connectors when endpoint does not exist', async () => {
      const connectors = [
        createConnector({
          id: 'inference-valid',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion', inferenceId: 'valid-endpoint' },
        }),
        createConnector({
          id: 'inference-invalid',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion', inferenceId: 'invalid-endpoint' },
        }),
      ];

      const mockCheckEndpoint = jest.fn().mockImplementation((inferenceId: string) => {
        return Promise.resolve(inferenceId === 'valid-endpoint');
      });

      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inference-valid');
      expect(mockCheckEndpoint).toHaveBeenCalledWith('valid-endpoint');
      expect(mockCheckEndpoint).toHaveBeenCalledWith('invalid-endpoint');
    });

    it('includes .inference connectors without inferenceId in config', async () => {
      const connectors = [
        createConnector({
          id: 'inference-no-id',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion' },
        }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(false);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      // Connector passes through because there's no inferenceId to validate
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inference-no-id');
      expect(mockCheckEndpoint).not.toHaveBeenCalled();
    });
  });

  describe('mixed connector scenarios', () => {
    it('correctly filters a mix of supported and unsupported connectors', async () => {
      const connectors = [
        createConnector({ id: 'openai-1', actionTypeId: '.gen-ai' }),
        createConnector({ id: 'slack-1', actionTypeId: '.slack' }),
        createConnector({ id: 'bedrock-1', actionTypeId: '.bedrock' }),
        createConnector({
          id: 'inference-chat',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'chat_completion', inferenceId: 'chat-endpoint' },
        }),
        createConnector({
          id: 'inference-embed',
          actionTypeId: INFERENCE_CONNECTOR_TYPE,
          config: { taskType: 'text_embedding', inferenceId: 'embed-endpoint' },
        }),
        createConnector({ id: 'webhook-1', actionTypeId: '.webhook' }),
        createConnector({ id: 'gemini-1', actionTypeId: '.gemini' }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(4);
      expect(result.map((c) => c.id)).toEqual([
        'openai-1',
        'bedrock-1',
        'inference-chat',
        'gemini-1',
      ]);
    });

    it('returns empty array when no connectors are supported', async () => {
      const connectors = [
        createConnector({ id: 'slack-1', actionTypeId: '.slack' }),
        createConnector({ id: 'email-1', actionTypeId: '.email' }),
      ];

      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors(connectors, mockCheckEndpoint);

      expect(result).toHaveLength(0);
    });

    it('returns empty array when given empty input', async () => {
      const mockCheckEndpoint = jest.fn().mockResolvedValue(true);
      const result = await filterSupportedConnectors([], mockCheckEndpoint);

      expect(result).toHaveLength(0);
      expect(mockCheckEndpoint).not.toHaveBeenCalled();
    });
  });
});
