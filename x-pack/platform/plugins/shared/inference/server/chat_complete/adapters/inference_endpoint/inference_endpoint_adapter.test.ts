/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { v4 } from 'uuid';
import { lastValueFrom, toArray, filter, noop, of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ToolChoiceType,
  ChatCompletionEventType,
  MessageRole,
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import type { InferenceEndpointExecutor } from '../../utils/inference_endpoint_executor';
import { inferenceEndpointAdapter } from './inference_endpoint_adapter';

function createOpenAIChunk({
  delta,
  usage,
}: {
  delta?: OpenAI.ChatCompletionChunk['choices'][number]['delta'];
  usage?: OpenAI.ChatCompletionChunk['usage'];
}): OpenAI.ChatCompletionChunk {
  return {
    choices: delta
      ? [
          {
            finish_reason: null,
            index: 0,
            delta,
          },
        ]
      : [],
    created: new Date().getTime(),
    id: v4(),
    model: 'gpt-4o',
    object: 'chat.completion.chunk',
    usage,
  };
}

const anthropicChunkBase = {
  id: 'chatcmpl-anthropic',
  object: null,
  created: 1753747200,
  model: 'claude-sonnet-4',
} as const;

describe('inferenceEndpointAdapter', () => {
  const executorMock: InferenceEndpointExecutor & {
    invoke: jest.MockedFn<InferenceEndpointExecutor['invoke']>;
  } = {
    invoke: jest.fn(),
  };

  const logger = loggerMock.create();

  beforeEach(() => {
    executorMock.invoke.mockReset();
  });

  const defaultArgs = {
    executor: executorMock,
    logger,
  };

  describe('when creating the request', () => {
    it('emits chunk events', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: { content: 'First' },
        }),
        createOpenAIChunk({
          delta: { content: ', second' },
        })
      );

      executorMock.invoke.mockResolvedValue(observableIntoEventSourceStream(source$, logger));

      const response$ = inferenceEndpointAdapter.chatComplete({
        ...defaultArgs,
        messages: [{ role: MessageRole.User, content: 'Hello' }],
      });

      const allChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(allChunks).toEqual([
        {
          content: 'First',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: ', second',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('emits Anthropic chunks with a null object', async () => {
      const source$ = of(
        {
          ...anthropicChunkBase,
          choices: [
            {
              index: 0,
              delta: { content: 'I will search.' },
              finish_reason: null,
            },
          ],
          usage: null,
        },
        {
          ...anthropicChunkBase,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'toolu_01',
                    function: { name: 'search', arguments: '{"query":"' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
          usage: null,
        },
        {
          ...anthropicChunkBase,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: 'kibana"}' },
                  },
                ],
              },
              finish_reason: 'tool_use',
            },
          ],
          usage: null,
        },
        {
          ...anthropicChunkBase,
          choices: [],
          usage: {
            completion_tokens: 12,
            prompt_tokens: 8,
            total_tokens: 20,
          },
        }
      );

      executorMock.invoke.mockResolvedValue(observableIntoEventSourceStream(source$, logger));

      const response = await lastValueFrom(
        inferenceEndpointAdapter
          .chatComplete({
            ...defaultArgs,
            messages: [{ role: MessageRole.User, content: 'Search Kibana' }],
          })
          .pipe(toArray())
      );

      expect(response).toEqual([
        {
          content: 'I will search.',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: '',
          tool_calls: [
            {
              function: { name: 'search', arguments: '{"query":"' },
              index: 0,
              toolCallId: 'toolu_01',
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: '',
          tool_calls: [
            {
              function: { name: '', arguments: 'kibana"}' },
              index: 0,
              toolCallId: '',
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          model: 'claude-sonnet-4',
          tokens: {
            completion: 12,
            prompt: 8,
            total: 20,
          },
          type: ChatCompletionEventType.ChatCompletionTokenCount,
        },
      ]);
    });

    it('ignores null-object events without array choices and unrelated object values', async () => {
      const source$ = of(
        {
          id: 'non-array-choices',
          object: null,
          choices: {},
          usage: {
            completion_tokens: 1,
            prompt_tokens: 1,
            total_tokens: 2,
          },
        },
        {
          id: 'missing-object',
          choices: [{ index: 0, delta: { content: 'ignored' }, finish_reason: null }],
        },
        {
          id: 'unrelated-object',
          object: 'content_block_delta',
          choices: [{ index: 0, delta: { content: 'ignored' }, finish_reason: null }],
        }
      );

      executorMock.invoke.mockResolvedValue(observableIntoEventSourceStream(source$, logger));

      const chunks = await lastValueFrom(
        inferenceEndpointAdapter
          .chatComplete({
            ...defaultArgs,
            messages: [{ role: MessageRole.User, content: 'Hello' }],
          })
          .pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(chunks).toEqual([]);
    });

    it('emits token count event when provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: { content: 'First' },
          usage: {
            completion_tokens: 5,
            prompt_tokens: 10,
            total_tokens: 15,
          },
        })
      );

      executorMock.invoke.mockResolvedValue(observableIntoEventSourceStream(source$, logger));

      const response$ = inferenceEndpointAdapter.chatComplete({
        ...defaultArgs,
        messages: [{ role: MessageRole.User, content: 'Hello' }],
      });

      const tokenChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionTokenCountEvent), toArray())
      );

      expect(tokenChunks).toEqual([
        {
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            completion: 5,
            prompt: 10,
            total: 15,
          },
          model: 'gpt-4o',
        },
      ]);
    });

    it('emits token count estimate when not provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: { content: 'First' },
        })
      );

      executorMock.invoke.mockResolvedValue(observableIntoEventSourceStream(source$, logger));

      const response$ = inferenceEndpointAdapter.chatComplete({
        ...defaultArgs,
        messages: [{ role: MessageRole.User, content: 'Hello' }],
      });

      const tokenChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionTokenCountEvent), toArray())
      );

      expect(tokenChunks).toHaveLength(1);
      expect(tokenChunks[0]).toMatchObject({
        type: ChatCompletionEventType.ChatCompletionTokenCount,
        tokens: {
          completion: expect.any(Number),
          prompt: expect.any(Number),
          total: expect.any(Number),
        },
      });
    });

    it('propagates the temperature parameter', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.4,
          modelName: 'gpt-4o',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            temperature: 0.4,
          }),
        })
      );
    });

    it('omits temperature when model metadata is missing', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.4,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('omits the default temperature for an unrecognized Claude endpoint model', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          endpointModelId: 'claude-sonnet-5',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('falls back to the request model when endpoint model metadata is missing', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'claude-sonnet-5',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('omits an explicit temperature for an unrecognized Claude endpoint model', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.4,
          endpointModelId: 'claude-opus-4.8',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('omits temperature when unset for a supported Claude endpoint model', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          endpointModelId: 'anthropic-claude-4.6-sonnet',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('keeps an explicit temperature for a supported Claude endpoint model', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0,
          endpointModelId: 'anthropic-claude-4.6-sonnet',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            temperature: 0,
          }),
        })
      );
    });

    it('omits temperature from simulated requests for unrecognized Claude endpoint models', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          functionCalling: 'simulated',
          temperature: 0.4,
          endpointModelId: 'claude-fable-5',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            temperature: expect.anything(),
          }),
        })
      );
    });

    it('propagates the abort signal', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      const abortController = new AbortController();

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('propagates the modelName parameter', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-4o',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            model: 'gpt-4o',
          }),
        })
      );
    });

    it('includes tools and tool_choice in the request when provided', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            myTool: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            tool_choice: 'auto',
          }),
        })
      );
    });

    it('uses simulated function calling when functionCalling is "simulated"', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          functionCalling: 'simulated',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.not.objectContaining({
            tools: expect.any(Array),
          }),
        })
      );
    });

    it('uses native function calling when functionCalling is "auto"', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          functionCalling: 'auto',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            tool_choice: 'auto',
          }),
        })
      );
    });

    it('propagates the timeout parameter', () => {
      executorMock.invoke.mockResolvedValue(
        observableIntoEventSourceStream(of(createOpenAIChunk({ delta: { content: '' } })), logger)
      );

      inferenceEndpointAdapter
        .chatComplete({
          ...defaultArgs,
          messages: [{ role: MessageRole.User, content: 'question' }],
          timeout: 30000,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('throws an error if the executor rejects', async () => {
      executorMock.invoke.mockRejectedValue(new Error('Inference endpoint not found'));

      await expect(
        lastValueFrom(
          inferenceEndpointAdapter
            .chatComplete({
              ...defaultArgs,
              messages: [{ role: MessageRole.User, content: 'Hello' }],
            })
            .pipe(toArray())
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Inference endpoint not found"`);
    });
  });
});
