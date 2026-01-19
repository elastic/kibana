/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNativeFunctionCallingSupportedMock } from './openai_adapter.test.mocks';
import type OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { pick } from 'lodash';
import { lastValueFrom, toArray, filter, of, noop } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ToolChoiceType,
  ChatCompletionEventType,
  isChatCompletionChunkEvent,
  MessageRole,
} from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { openAIAdapter } from './openai_adapter';

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

function createOpenAIResponse({
  content = null,
  tool_calls = [],
  usage,
}: {
  content?: string | null;
  tool_calls?: OpenAI.ChatCompletion['choices'][0]['message']['tool_calls'];
  usage?: OpenAI.ChatCompletion['usage'];
}): OpenAI.ChatCompletion {
  return {
    id: v4(),
    created: new Date().getTime(),
    model: 'gpt-4o',
    object: 'chat.completion',
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: { content, refusal: null, role: 'assistant', tool_calls },
        logprobs: null,
      },
    ],
    usage,
  };
}

describe('openAIAdapter', () => {
  const executorMock = {
    getConnector: jest.fn(),
    invoke: jest.fn(),
  } as InferenceExecutor & {
    invoke: jest.MockedFn<InferenceExecutor['invoke']>;
    getConnector: jest.MockedFn<InferenceExecutor['getConnector']>;
  };

  const logger = loggerMock.create();

  beforeEach(() => {
    executorMock.invoke.mockReset();
    isNativeFunctionCallingSupportedMock.mockReset().mockReturnValue(true);

    executorMock.invoke.mockImplementation(async () => {
      return {
        actionId: '',
        status: 'ok',
        data: new PassThrough(),
      };
    });
  });

  const defaultArgs = {
    executor: executorMock,
    logger,
  };

  function getRequest() {
    const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;

    return { stream: params.stream, body: JSON.parse(params.body) };
  }

  describe('when creating the request', () => {
    it('correctly formats messages ', () => {
      openAIAdapter
        .chatComplete({
          ...defaultArgs,
          system: 'system',
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
            {
              role: MessageRole.Assistant,
              content: 'answer',
            },
            {
              role: MessageRole.User,
              content: 'another question',
            },
          ],
        })
        .subscribe(noop);

      expect(getRequest().body.messages).toEqual([
        {
          content: 'system',
          role: 'system',
        },
        {
          content: 'question',
          role: 'user',
        },
        {
          content: 'answer',
          role: 'assistant',
        },
        {
          content: 'another question',
          role: 'user',
        },
      ]);
    });

    it('correctly formats messages with content parts', () => {
      openAIAdapter
        .chatComplete({
          executor: executorMock,
          logger,
          messages: [
            {
              role: MessageRole.User,
              content: [
                {
                  type: 'text',
                  text: 'question',
                },
              ],
            },
            {
              role: MessageRole.Assistant,
              content: 'answer',
            },
            {
              role: MessageRole.User,
              content: [
                {
                  type: 'image',
                  source: {
                    data: 'aaaaaa',
                    mimeType: 'image/png',
                  },
                },
                {
                  type: 'image',
                  source: {
                    data: 'bbbbbb',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          ],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const {
        body: { messages },
      } = getRequest();

      expect(messages).toEqual([
        {
          content: [
            {
              text: 'question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          content: 'answer',
          role: 'assistant',
        },
        {
          content: [
            {
              type: 'image_url',
              image_url: {
                url: 'aaaaaa',
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: 'bbbbbb',
              },
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('correctly formats tools and tool choice', () => {
      openAIAdapter
        .chatComplete({
          ...defaultArgs,
          system: 'system',
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
            {
              role: MessageRole.Assistant,
              content: 'answer',
              toolCalls: [
                {
                  function: {
                    name: 'my_function',
                    arguments: {
                      foo: 'bar',
                    },
                  },
                  toolCallId: '0',
                },
              ],
            },
            {
              name: 'my_function',
              role: MessageRole.Tool,
              toolCallId: '0',
              response: {
                bar: 'foo',
              },
            },
          ],
          toolChoice: { function: 'myFunction' },
          tools: {
            myFunction: {
              description: 'myFunction',
            },
            myFunctionWithArgs: {
              description: 'myFunctionWithArgs',
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'foo',
                  },
                },
                required: ['foo'],
              },
            },
          },
        })
        .subscribe(noop);

      expect(pick(getRequest().body, 'messages', 'tools', 'tool_choice')).toEqual({
        messages: [
          {
            content: 'system',
            role: 'system',
          },
          {
            content: 'question',
            role: 'user',
          },
          {
            content: 'answer',
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'my_function',
                  arguments: JSON.stringify({ foo: 'bar' }),
                },
                id: '0',
                type: 'function',
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: '0',
            content: JSON.stringify({ bar: 'foo' }),
          },
        ],
        tools: [
          {
            function: {
              name: 'myFunction',
              description: 'myFunction',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
            type: 'function',
          },
          {
            function: {
              name: 'myFunctionWithArgs',
              description: 'myFunctionWithArgs',
              parameters: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'foo',
                  },
                },
                required: ['foo'],
              },
            },
            type: 'function',
          },
        ],
        tool_choice: {
          function: {
            name: 'myFunction',
          },
          type: 'function',
        },
      });
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      openAIAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'stream',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('uses the right value for functionCalling=auto', () => {
      isNativeFunctionCallingSupportedMock.mockReturnValue(false);

      openAIAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          functionCalling: 'auto',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(getRequest().body.tools).toBeUndefined();
    });

    it('propagates the temperature parameter', () => {
      openAIAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.7,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(getRequest().body.temperature).toBe(0.7);
    });

    it('propagates the modelName parameter', () => {
      openAIAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-4o',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(getRequest().body.model).toBe('gpt-4o');
    });
  });

  describe('streaming mode', () => {
    it('sets streaming to true', () => {
      openAIAdapter
        .chatComplete({
          ...defaultArgs,
          stream: true,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        })
        .subscribe(noop);

      expect(getRequest().stream).toBe(true);
      expect(getRequest().body.stream).toBe(true);
    });

    describe('when handling the response', () => {
      it('throws an error if the connector response is in error', async () => {
        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: 'actionId',
            status: 'error',
            serviceMessage: 'something went wrong',
            data: undefined,
          };
        });

        await expect(
          lastValueFrom(
            openAIAdapter
              .chatComplete({
                ...defaultArgs,
                stream: true,
                messages: [{ role: MessageRole.User, content: 'Hello' }],
              })
              .pipe(toArray())
          )
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Error calling connector: something went wrong"`
        );
      });

      it('emits chunk events', async () => {
        const source$ = of(
          createOpenAIChunk({
            delta: {
              content: 'First',
            },
          }),
          createOpenAIChunk({
            delta: {
              content: ', second',
            },
          })
        );

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: observableIntoEventSourceStream(source$, logger),
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: true,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
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

      it('emits chunk events with tool calls', async () => {
        const source$ = of(
          createOpenAIChunk({
            delta: {
              content: 'First',
            },
          }),
          createOpenAIChunk({
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: '0',
                  function: {
                    name: 'my_function',
                    arguments: '{}',
                  },
                },
              ],
            },
          })
        );

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: observableIntoEventSourceStream(source$, logger),
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: true,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
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
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'my_function',
                  arguments: '{}',
                },
                index: 0,
                toolCallId: '0',
              },
            ],
            type: ChatCompletionEventType.ChatCompletionChunk,
          },
        ]);
      });

      it('emits token count events', async () => {
        const source$ = of(
          createOpenAIChunk({
            delta: {
              content: 'chunk',
            },
          }),
          createOpenAIChunk({
            usage: {
              prompt_tokens: 50,
              completion_tokens: 100,
              total_tokens: 150,
            },
          })
        );

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: observableIntoEventSourceStream(source$, logger),
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: true,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(response$.pipe(toArray()));

        expect(allChunks).toEqual([
          {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: 'chunk',
            tool_calls: [],
          },
          {
            type: ChatCompletionEventType.ChatCompletionTokenCount,
            tokens: {
              prompt: 50,
              completion: 100,
              total: 150,
            },
            model: 'gpt-4o', // Model from createOpenAIChunk helper
          },
        ]);
      });

      it('emits token count event when not provided by the response', async () => {
        const source$ = of(
          createOpenAIChunk({
            delta: {
              content: 'chunk',
            },
          })
        );

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: observableIntoEventSourceStream(source$, logger),
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: true,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(response$.pipe(toArray()));

        expect(allChunks).toHaveLength(2);
        expect(allChunks[0]).toEqual({
          type: ChatCompletionEventType.ChatCompletionChunk,
          content: 'chunk',
          tool_calls: [],
        });
        expect(allChunks[1]).toMatchObject({
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            completion: expect.any(Number),
            prompt: expect.any(Number),
            total: expect.any(Number),
          },
        });
        // Model field is optional - only present if request.model is set
        // Since no modelName is provided, model should be undefined/not present
      });
    });
  });

  describe('non-streaming mode', () => {
    it('sets streaming to false', () => {
      openAIAdapter
        .chatComplete({
          ...defaultArgs,
          stream: false,
          messages: [
            {
              role: MessageRole.User,
              content: 'question',
            },
          ],
        })
        .subscribe(noop);

      expect(getRequest().stream).toBe(false);
      expect(getRequest().body.stream).toBe(false);
    });

    describe('when handling the response', () => {
      it('throws an error if the connector response is in error', async () => {
        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: 'actionId',
            status: 'error',
            serviceMessage: 'something went wrong',
            data: undefined,
          };
        });

        await expect(
          lastValueFrom(
            openAIAdapter
              .chatComplete({
                ...defaultArgs,
                stream: false,
                messages: [{ role: MessageRole.User, content: 'Hello' }],
              })
              .pipe(toArray())
          )
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Error calling connector: something went wrong"`
        );
      });

      it('emits a chunk event with the response', async () => {
        const source = createOpenAIResponse({ content: 'Hello' });

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: source,
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: false,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(
          response$.pipe(filter(isChatCompletionChunkEvent), toArray())
        );

        expect(allChunks).toEqual([
          {
            content: 'Hello',
            tool_calls: [],
            type: ChatCompletionEventType.ChatCompletionChunk,
          },
        ]);
      });

      it('emits chunk events with tool calls', async () => {
        const source = createOpenAIResponse({
          content: 'Hello',
          tool_calls: [
            {
              id: '0',
              function: {
                name: 'my_function',
                arguments: '{}',
              },
              type: 'function',
            },
          ],
        });

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: source,
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: false,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(
          response$.pipe(filter(isChatCompletionChunkEvent), toArray())
        );

        expect(allChunks).toEqual([
          {
            content: 'Hello',
            tool_calls: [
              {
                function: {
                  name: 'my_function',
                  arguments: '{}',
                },
                index: 0,
                toolCallId: '0',
              },
            ],
            type: ChatCompletionEventType.ChatCompletionChunk,
          },
        ]);
      });

      it('emits token count events', async () => {
        const source = createOpenAIResponse({
          content: 'response',
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
        });

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: source,
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: false,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(response$.pipe(toArray()));

        expect(allChunks).toEqual([
          {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: 'response',
            tool_calls: [],
          },
          {
            type: ChatCompletionEventType.ChatCompletionTokenCount,
            tokens: {
              prompt: 50,
              completion: 100,
              total: 150,
            },
            model: 'gpt-4o',
          },
        ]);
      });

      it('emits token count event when not provided by the response', async () => {
        const source = createOpenAIResponse({
          content: 'response',
        });

        executorMock.invoke.mockImplementation(async () => {
          return {
            actionId: '',
            status: 'ok',
            data: source,
          };
        });

        const response$ = openAIAdapter.chatComplete({
          ...defaultArgs,
          stream: false,
          messages: [
            {
              role: MessageRole.User,
              content: 'Hello',
            },
          ],
        });

        const allChunks = await lastValueFrom(response$.pipe(toArray()));

        expect(allChunks).toHaveLength(2);
        expect(allChunks[0]).toEqual({
          type: ChatCompletionEventType.ChatCompletionChunk,
          content: 'response',
          tool_calls: [],
        });
        expect(allChunks[1]).toMatchObject({
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            completion: expect.any(Number),
            prompt: expect.any(Number),
            total: expect.any(Number),
          },
        });
      });
    });
  });
});
