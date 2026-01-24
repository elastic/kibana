/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import type { ConverseResponse } from '@aws-sdk/client-bedrock-runtime';
import { processConverseResponse } from './process_converse_response';

describe('processConverseResponse', () => {
  const createResponse = (partial: Partial<ConverseResponse>): ConverseResponse => ({
    stopReason: 'end_turn',
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    metrics: { latencyMs: 100 },
    output: undefined,
    ...partial,
  });

  it('emits a chunk event when the response contains text content', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'Hello, world!' }],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'Hello, world!',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('emits a chunk event when the response contains tool use', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: 'tool-123',
                name: 'get_weather',
                input: { location: 'Paris' },
              },
            },
          ],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [
          {
            index: 0,
            toolCallId: 'tool-123',
            function: {
              name: 'get_weather',
              arguments: '{"location":"Paris"}',
            },
          },
        ],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('emits a chunk event with multiple tool calls', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: 'tool-1',
                name: 'get_weather',
                input: { location: 'Paris' },
              },
            },
            {
              toolUse: {
                toolUseId: 'tool-2',
                name: 'get_time',
                input: { timezone: 'UTC' },
              },
            },
          ],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [
          {
            index: 0,
            toolCallId: 'tool-1',
            function: {
              name: 'get_weather',
              arguments: '{"location":"Paris"}',
            },
          },
          {
            index: 1,
            toolCallId: 'tool-2',
            function: {
              name: 'get_time',
              arguments: '{"timezone":"UTC"}',
            },
          },
        ],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('emits a chunk event with both text and tool use', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [
            { text: 'Let me check the weather.' },
            {
              toolUse: {
                toolUseId: 'tool-123',
                name: 'get_weather',
                input: { location: 'Paris' },
              },
            },
          ],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'Let me check the weather.',
        tool_calls: [
          {
            index: 0,
            toolCallId: 'tool-123',
            function: {
              name: 'get_weather',
              arguments: '{"location":"Paris"}',
            },
          },
        ],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('concatenates multiple text blocks', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'Hello, ' }, { text: 'world!' }],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'Hello, world!',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('emits a token count event when usage is present', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'Hello!' }],
        },
      },
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'Hello!',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 10,
          completion: 5,
          total: 15,
        },
      },
    ]);
  });

  it('includes model in token count event when provided', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'Hello!' }],
        },
      },
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    });

    const result = await lastValueFrom(
      of(response).pipe(processConverseResponse('anthropic.claude-3'), toArray())
    );

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: 'Hello!',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 10,
          completion: 5,
          total: 15,
        },
        model: 'anthropic.claude-3',
      },
    ]);
  });

  it('emits a chunk event with empty content when message has no content', async () => {
    const response = createResponse({
      output: {
        message: {
          role: 'assistant',
          content: [],
        },
      },
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });

  it('emits a chunk event with empty content when output is missing message', async () => {
    const response = createResponse({
      // @ts-expect-error output is missing message
      output: {},
    });

    const result = await lastValueFrom(of(response).pipe(processConverseResponse(), toArray()));

    expect(result).toEqual([
      {
        type: 'chatCompletionChunk',
        content: '',
        tool_calls: [],
      },
      {
        type: 'chatCompletionTokenCount',
        tokens: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      },
    ]);
  });
});
