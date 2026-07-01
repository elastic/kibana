/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClientLlm } from './inference_client_llm';
import type { InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { Logger } from '@kbn/core/server';

describe('InferenceClientLlm', () => {
  let mockInferenceClient: jest.Mocked<InferenceClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockInferenceClient = {
      chatComplete: jest.fn().mockResolvedValue({ content: 'mocked response' }),
    } as unknown as jest.Mocked<InferenceClient>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  it('returns the correct content from inferenceClient.chatComplete()', async () => {
    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
    });

    const result = await llm._call('test prompt');
    expect(result).toBe('mocked response');
    expect(mockInferenceClient.chatComplete).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      messages: [{ role: MessageRole.User, content: 'test prompt' }],
      temperature: 0,
    });
  });

  it('passes connectorId, temperature, model, timeout, systemPrompt, and telemetryMetadata correctly', async () => {
    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
      model: 'test-model',
      temperature: 0.5,
      timeout: 1000,
      systemPrompt: 'test system prompt',
      telemetryMetadata: { pluginId: 'test_plugin' },
    });

    await llm._call('test prompt');
    expect(mockInferenceClient.chatComplete).toHaveBeenCalledWith({
      connectorId: 'test-connector',
      messages: [{ role: MessageRole.User, content: 'test prompt' }],
      temperature: 0.5,
      modelName: 'test-model',
      timeout: 1000,
      system: 'test system prompt',
      metadata: { pluginId: 'test_plugin' },
    });
  });

  it('_llmType() returns the configured llmType', () => {
    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
      llmType: 'custom-type',
    });

    expect(llm._llmType()).toBe('custom-type');
  });

  it('_llmType() defaults to "InferenceClientLlm"', () => {
    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
    });

    expect(llm._llmType()).toBe('InferenceClientLlm');
  });

  it('_call() logs a debug message', async () => {
    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
    });

    await llm._call('test prompt');
    expect(mockLogger.debug).toHaveBeenCalled();
    const logMessageFn = mockLogger.debug.mock.calls[0][0] as () => string;
    expect(logMessageFn()).toBe(
      'InferenceClientLlm: calling chatComplete for connector test-connector'
    );
  });

  it('_call() logs an error message if chatComplete fails', async () => {
    const error = new Error('test error');
    Object.assign(error, { code: 'TEST_ERROR' });
    mockInferenceClient.chatComplete.mockRejectedValueOnce(error);

    const llm = new InferenceClientLlm({
      connectorId: 'test-connector',
      inferenceClient: mockInferenceClient,
      logger: mockLogger,
    });

    await expect(llm._call('test prompt')).rejects.toThrow('test error');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'InferenceClientLlm: chatComplete failed for connector test-connector: TEST_ERROR - test error'
    );
  });
});
