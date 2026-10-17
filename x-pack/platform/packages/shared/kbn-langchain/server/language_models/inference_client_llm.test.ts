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
import { EMPTY_MODEL_RESPONSE_ERROR_CODE, EmptyModelResponseError } from '..';

describe('InferenceClientLlm', () => {
  const connectorId = 'test-connector';
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

  describe('empty completions', () => {
    it('rejects with an empty-response error when the model returns no content', async () => {
      (mockInferenceClient.chatComplete as jest.Mock).mockResolvedValue({
        content: '',
        model: 'anthropic-claude-5.5-opus',
        tokens: { completion: 0, prompt: 128390, total: 128390 },
        toolCalls: [],
      });

      const llm = new InferenceClientLlm({
        connectorId,
        inferenceClient: mockInferenceClient,
        logger: mockLogger,
        model: 'anthropic-claude-5.5-opus',
      });

      const error = await llm._call('test prompt').catch((e) => e);

      expect(error).toBeInstanceOf(EmptyModelResponseError);
      expect(error.message).toContain('the model returned an empty response');
      expect(error.message).toContain(connectorId);
      expect(error.message).toContain('anthropic-claude-5.5-opus');
      expect(error.message).toContain('prompt tokens: 128390');
      expect(error.message).toContain('completion tokens: 0');
      expect(error).toEqual(
        expect.objectContaining({
          code: EMPTY_MODEL_RESPONSE_ERROR_CODE,
          completionTokens: 0,
          connectorId,
          contentLength: 0,
          model: 'anthropic-claude-5.5-opus',
          promptTokens: 128390,
        })
      );
      // logged at `error` (persisted), not debug-only: serverless has no log-level switch
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('falls back to the configured model name when the response omits one', async () => {
      (mockInferenceClient.chatComplete as jest.Mock).mockResolvedValue({
        content: '',
        toolCalls: [],
      });

      const llm = new InferenceClientLlm({
        connectorId,
        inferenceClient: mockInferenceClient,
        logger: mockLogger,
        model: 'configured-model',
      });

      const error = await llm._call('test prompt').catch((e) => e);

      expect(error).toBeInstanceOf(EmptyModelResponseError);
      expect(error.model).toBe('configured-model');
      expect(error.message).toContain('configured-model');
    });

    it('treats a whitespace-only response as an empty response', async () => {
      (mockInferenceClient.chatComplete as jest.Mock).mockResolvedValue({
        content: '   \n',
        toolCalls: [],
      });

      const llm = new InferenceClientLlm({
        connectorId,
        inferenceClient: mockInferenceClient,
        logger: mockLogger,
      });

      const error = await llm._call('test prompt').catch((e) => e);

      expect(error).toBeInstanceOf(EmptyModelResponseError);
      expect(error.contentLength).toBe(4);
    });

    it('does NOT treat a tool-call-only response as an empty response', async () => {
      (mockInferenceClient.chatComplete as jest.Mock).mockResolvedValue({
        content: '',
        toolCalls: [{ function: { arguments: '{}', name: 'some_tool' }, id: 'tool-call-1' }],
      });

      const llm = new InferenceClientLlm({
        connectorId,
        inferenceClient: mockInferenceClient,
        logger: mockLogger,
      });

      const result = await llm._call('test prompt');

      expect(result).toBe('');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('does not report the empty response as a chatComplete transport failure', async () => {
      (mockInferenceClient.chatComplete as jest.Mock).mockResolvedValue({
        content: '',
        toolCalls: [],
      });

      const llm = new InferenceClientLlm({
        connectorId,
        inferenceClient: mockInferenceClient,
        logger: mockLogger,
      });

      await llm._call('test prompt').catch(() => undefined);

      // the transport-failure log line must not be emitted for a successful-but-empty completion
      const errorLogCalls = mockLogger.error.mock.calls.map((call) => String(call[0]));
      expect(errorLogCalls.some((message) => message.includes('chatComplete failed'))).toBe(false);
    });
  });
});
