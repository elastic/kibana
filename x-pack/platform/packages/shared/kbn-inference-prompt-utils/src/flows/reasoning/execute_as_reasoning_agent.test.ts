/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, Prompt, ToolMessage } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { executeAsReasoningAgent } from './execute_as_reasoning_agent';
import { z } from '@kbn/zod';
import { END_INTERNAL_REASONING_MARKER } from './markers';

function makePrompt() {
  return {
    name: 'test_prompt',
    input: z.object({
      foo: z.string(),
    }),
    versions: [
      {
        template: {
          static: {
            content: 'do it',
          },
        },
        tools: {
          complete: {
            description: 'complete task',
            schema: { type: 'object', properties: {} },
          },
          fetch_data: {
            description: 'fetch data',
            schema: { type: 'object', properties: {} },
          },
        },
      },
    ],
  } satisfies Prompt;
}

describe('executeAsReasoningAgent', () => {
  test('returns final tool call when finalToolChoice is provided', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest.fn().mockResolvedValue({
        content: 'done',
        toolCalls: [
          {
            type: 'function',
            function: { name: 'complete', arguments: {} },
            toolCallId: '1',
          },
        ],
        tokens: 1,
      }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    const result = await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 1,
      toolCallbacks: {
        fetch_data: jest.fn(),
        complete: jest.fn(),
      },
      input: {
        foo: '',
      },
      finalToolChoice: { type: 'function', function: 'complete' },
    });

    expect(inferenceClient.prompt).toHaveBeenCalled();
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0].function.name).toBe('complete');
  });

  test('throws when planning tool response includes additional tool calls', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest.fn().mockResolvedValue({
        content: 'thinking',
        toolCalls: [
          { type: 'function', function: { name: 'reason', arguments: {} }, toolCallId: 'a' },
          { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'b' },
        ],
        tokens: 1,
      }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    await expect(
      executeAsReasoningAgent({
        inferenceClient,
        prompt,
        maxSteps: 1,
        toolCallbacks: { fetch_data: jest.fn(), complete: jest.fn() },
        input: {
          foo: '',
        },
      })
    ).rejects.toThrow('only a single tool call is allowed');
  });

  test('executes task tool callbacks and injects stepsLeft', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest
        .fn()
        .mockResolvedValueOnce({
          content: 'call tool',
          toolCalls: [
            { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'x' },
          ],
          tokens: 1,
        })
        .mockResolvedValueOnce({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    const fetchData = jest.fn().mockResolvedValue({ response: { result: 'ok' } });

    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 1,
      toolCallbacks: { fetch_data: fetchData, complete: jest.fn() },
      input: { foo: '' },
    });

    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(inferenceClient.prompt).toHaveBeenCalledTimes(2);
    const secondArgs = inferenceClient.prompt.mock.calls[1][0];
    const prevMessages = secondArgs.prevMessages!;
    const toolMsg = prevMessages.find((m): m is ToolMessage => m.role === MessageRole.Tool);

    expect(toolMsg?.response).toEqual({ result: 'ok', stepsLeft: 1 });
  });

  test('completes next turn when content includes external part after END_INTERNAL marker', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest
        .fn()
        .mockResolvedValueOnce({
          content: `internal${END_INTERNAL_REASONING_MARKER}this should trigger completion on next turn because it is long enough to pass threshold of buffer characters`,
          toolCalls: [],
          tokens: 1,
        })
        .mockResolvedValueOnce({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 2,
      toolCallbacks: { fetch_data: jest.fn(), complete: jest.fn() },
      input: { foo: '' },
    });

    expect(inferenceClient.prompt).toHaveBeenCalledTimes(2);
  });

  test('tool callback error is captured and injected into tool response', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest
        .fn()
        .mockResolvedValueOnce({
          content: 'call tool',
          toolCalls: [
            { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'x' },
          ],
          tokens: 1,
        })
        .mockResolvedValueOnce({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    const fetchData = jest.fn().mockRejectedValue(new Error('nope'));

    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 1,
      toolCallbacks: { fetch_data: fetchData, complete: jest.fn() },
      input: { foo: '' },
    });

    expect(fetchData).toHaveBeenCalledTimes(1);
    const secondArgs = inferenceClient.prompt.mock.calls[1][0];
    const prevMessages = secondArgs.prevMessages!;
    const toolMsg = prevMessages.find((m) => m.role === MessageRole.Tool);
    expect(toolMsg).toEqual({
      name: 'fetch_data',
      response: {
        error: expect.any(Object),
        stepsLeft: 1,
      },
      role: 'tool',
      toolCallId: 'x',
    });
  });

  test('string tool callback result is mapped to response.result', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest
        .fn()
        .mockResolvedValueOnce({
          content: 'call tool',
          toolCalls: [
            { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'x' },
          ],
          tokens: 1,
        })
        .mockResolvedValueOnce({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    const fetchData = jest.fn().mockResolvedValue({ response: 'ok' });

    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 1,
      toolCallbacks: { fetch_data: fetchData, complete: jest.fn() },
      input: { foo: '' },
    });

    const secondArgs = inferenceClient.prompt.mock.calls[1][0];
    const prevMessages = secondArgs.prevMessages!;

    const toolMsg = prevMessages.find((m): m is ToolMessage => m.role === MessageRole.Tool);

    expect(toolMsg?.response).toEqual({ content: 'ok', stepsLeft: 1 });
  });

  test('planning tools merged when not completing, omitted when completing; toolChoice set on completing', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest.fn().mockResolvedValue({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    // First call: not completing, planning tools should be merged
    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 1,
      toolCallbacks: { fetch_data: jest.fn(), complete: jest.fn() },
      input: { foo: '' },
    });
    const firstCall = inferenceClient.prompt.mock.calls[0][0];
    const toolsNonCompleting = Object.keys(firstCall.prompt.versions[0].tools ?? {});
    expect(toolsNonCompleting).toContain('reason');

    // Second run: completing turn from the start
    inferenceClient.prompt.mockClear();
    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 0,
      toolCallbacks: { fetch_data: jest.fn(), complete: jest.fn() },
      input: { foo: '' },
      finalToolChoice: { type: 'function', function: 'complete' },
    });
    const completingCall = (inferenceClient.prompt as jest.Mock).mock.calls[0][0];

    expect(completingCall.toolChoice).toEqual({ type: 'function', function: 'complete' });
  });

  test('input is sanitized on completion (system tool calls removed)', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest.fn().mockResolvedValue({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    const res = await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 0,
      toolCallbacks: { fetch_data: jest.fn(), complete: jest.fn() },
      input: { foo: '' },
      finalToolChoice: { type: 'function', function: 'complete' },
    });

    // No tool messages with planning tool names in sanitized input
    const hasPlanningTool = res.input.some(
      (m) => m.role === MessageRole.Tool && m.name && ['reason', 'complete'].includes(m.name)
    );
    expect(hasPlanningTool).toBe(false);
  });

  test('earlier reason tool calls are pruned', async () => {
    const prompt = makePrompt();
    const inferenceClient = {
      prompt: jest
        .fn()
        .mockResolvedValueOnce({
          content: 'gathering-1',
          toolCalls: [
            { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'f1' },
          ],
          tokens: 1,
        })
        .mockResolvedValueOnce({
          content: 'gathering-2',
          toolCalls: [
            { type: 'function', function: { name: 'fetch_data', arguments: {} }, toolCallId: 'f2' },
          ],
          tokens: 1,
        })
        .mockResolvedValueOnce({ content: 'final', toolCalls: [], tokens: 1 }),
    } as Partial<jest.Mocked<BoundInferenceClient>> as jest.Mocked<BoundInferenceClient>;

    await executeAsReasoningAgent({
      inferenceClient,
      prompt,
      maxSteps: 2,
      toolCallbacks: {
        fetch_data: jest.fn().mockResolvedValue({ response: 'ok' }),
        complete: jest.fn(),
      },
      input: { foo: '' },
    });

    const thirdArgs = inferenceClient.prompt.mock.calls[2][0];
    const prevMessages = thirdArgs.prevMessages!;

    const fetchDataToolIds = prevMessages
      .filter((m): m is ToolMessage => m.role === MessageRole.Tool && m.name === 'fetch_data')
      .map((m) => m.toolCallId);

    const reasonToolCalls = prevMessages.filter(
      (message): message is ToolMessage =>
        message.role === MessageRole.Tool && message.name === 'reason'
    );

    expect(fetchDataToolIds).toEqual(['f1', 'f2']);

    expect(reasonToolCalls.length).toEqual(0);
  });
});
