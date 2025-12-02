/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole, type Prompt, type ToolCall, type ToolMessage } from '@kbn/inference-common';
import { executeUntilValid } from './execute_until_valid';
import { trace as otelTrace } from '@opentelemetry/api';

const trace = otelTrace as jest.Mocked<typeof otelTrace>;

jest.mock('@opentelemetry/api', () => {
  const recordException = jest.fn();

  const getActiveSpan = jest.fn(() => ({ recordException }));

  return {
    trace: {
      getActiveSpan,
    },
  };
});

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: {
    InferenceSpanKind: 'CHAIN',
  },
  withActiveInferenceSpan: jest.fn(async (_name: string, _options: unknown, fn: () => unknown) =>
    fn()
  ),
  withExecuteToolSpan: jest.fn(
    async (_toolName: string, _attributes: unknown, fn: () => Promise<unknown>) => fn()
  ),
}));

describe('executeUntilValid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves with the first prompt response when no tool errors occur', async () => {
    const mockContent = [{ text: 'complete' }];

    const promptSpy = jest.fn().mockResolvedValue({
      content: mockContent,
      toolCalls: [],
      tokens: { completion: 10 },
    });

    const result = await executeUntilValid({
      finalToolChoice: { function: 'noop' } as any,
      inferenceClient: { prompt: promptSpy } as unknown as BoundInferenceClient,
      maxRetries: 3,
      prompt: {} as unknown as Prompt,
      toolCallbacks: {},
      input: {},
    });

    expect(result.content).toBe(mockContent);
    expect(result.toolCalls).toHaveLength(0);
    expect(result.input).toEqual<MessageRole[]>([] as unknown as MessageRole[]);
    expect(promptSpy).toHaveBeenCalledTimes(1);
  });

  it('retries when a tool callback throws and passes error details back to the prompt', async () => {
    const failingToolCall = {
      function: { name: 'repair', arguments: '{}' },
      toolCallId: 'call-1',
    } as unknown as ToolCall;

    const firstPromptResponse = {
      content: [],
      toolCalls: [failingToolCall],
      tokens: { completion: 1 },
    };

    const successfulPromptResponse = {
      content: [{ text: 'fixed' }],
      toolCalls: [],
      tokens: { completion: 2 },
    };

    const promptSpy = jest
      .fn()
      .mockResolvedValueOnce(firstPromptResponse)
      .mockResolvedValueOnce(successfulPromptResponse);

    const toolCallbackError = new Error('tool failure');

    const toolCallback = jest.fn().mockRejectedValueOnce(toolCallbackError);

    const result = await executeUntilValid({
      finalToolChoice: { function: 'repair' } as any,
      inferenceClient: { prompt: promptSpy } as unknown as BoundInferenceClient,
      maxRetries: 2,
      prompt: {} as unknown as Prompt,
      toolCallbacks: { repair: toolCallback },
      input: {},
    });

    expect(promptSpy).toHaveBeenCalledTimes(2);

    const secondCallOptions = promptSpy.mock.calls[1][0];

    expect(secondCallOptions.prevMessages).toHaveLength(1);
    expect(secondCallOptions.prevMessages[0]).toEqual<ToolMessage>(
      expect.objectContaining({
        name: 'repair',
        role: MessageRole.Tool,
        toolCallId: 'call-1',
        response: expect.objectContaining({
          error: toolCallbackError,
          stepsLeft: 3,
        }),
      })
    );

    expect(result.content).toBe(successfulPromptResponse.content);
    expect(trace.getActiveSpan()?.recordException).toHaveBeenCalledWith(toolCallbackError);
  });

  it('throws an AggregateError when retries are exhausted', async () => {
    const persistentToolCall = {
      function: { name: 'retry', arguments: '{}' },
      toolCallId: 'call-1',
    } as unknown as ToolCall;

    const promptSpy = jest.fn().mockResolvedValue({
      content: [],
      toolCalls: [persistentToolCall],
      tokens: { completion: 1 },
    });

    const persistentError = new Error('still failing');

    const options = {
      finalToolChoice: { function: 'retry' },
      inferenceClient: { prompt: promptSpy } as unknown as BoundInferenceClient,
      maxRetries: 0,
      prompt: {} as unknown as Prompt,
      toolCallbacks: { retry: jest.fn().mockRejectedValue(persistentError) },
      input: {},
    } as unknown as Parameters<typeof executeUntilValid>[0];

    const execution = executeUntilValid(options);

    await expect(execution).rejects.toThrow(
      'LLM could not complete task successfully in 1 attempts'
    );

    await execution.catch((error) => {
      const aggregateError = error as AggregateError;
      expect(aggregateError).toBeInstanceOf(AggregateError);
      expect(aggregateError.errors).toEqual([persistentError]);
    });

    expect(promptSpy).toHaveBeenCalledTimes(2);
    expect(trace.getActiveSpan()?.recordException).toHaveBeenCalledTimes(2);
  });
});
