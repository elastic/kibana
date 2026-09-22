/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNativeFunctionCallingSupportedMock } from './inference_adapter.test.mocks';
import type OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { lastValueFrom, toArray, filter, noop, of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ToolChoiceType,
  ChatCompletionEventType,
  MessageRole,
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
  InferenceConnectorType,
} from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { inferenceAdapter } from './inference_adapter';

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

describe('inferenceAdapter', () => {
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
    executorMock.getConnector.mockReset().mockImplementation(() => {
      return {
        type: InferenceConnectorType.Inference,
        name: 'inference connector',
        connectorId: '.id',
        config: {},
        capabilities: {},
        isInferenceEndpoint: false,
        isPreconfigured: false,
      };
    });
  });

  const defaultArgs = {
    executor: executorMock,
    logger,
  };

  describe('when creating the request', () => {
    beforeEach(() => {
      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: new PassThrough(),
        };
      });
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

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
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

    it('emits token count event when provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
          usage: {
            completion_tokens: 5,
            prompt_tokens: 10,
            total_tokens: 15,
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

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
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
          model: 'gpt-4o', // Model from createOpenAIChunk helper
        },
      ]);
    });

    it('emits token count event when not provided by the response', async () => {
      const source$ = of(
        createOpenAIChunk({
          delta: {
            content: 'First',
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

      const response$ = inferenceAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
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
      // Model field is optional - only present if request.model is set
      // Since no modelName is provided, model should be undefined/not present
    });

    it('propagates the temperature parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          temperature: 0.4,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            temperature: 0.4,
          }),
        }),
      });
    });

    it('defaults reasoning effort to none when native tools are present and the model requires it', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-5.4',
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            reasoning: { effort: 'none' },
          }),
        }),
      });
    });

    it('resolves the model from the connector inference endpoint id for the reasoning default', () => {
      executorMock.getConnector.mockImplementation(() => {
        return {
          type: InferenceConnectorType.Inference,
          name: 'inference connector',
          connectorId: '.id',
          config: { provider: 'elastic', inferenceId: '.openai-gpt-5.4-chat_completion' },
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        };
      });

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            tools: expect.any(Array),
            reasoning: { effort: 'none' },
          }),
        }),
      });
    });

    it('omits the reasoning default when the model does not tolerate disabled reasoning', () => {
      executorMock.getConnector.mockImplementation(() => {
        return {
          type: InferenceConnectorType.Inference,
          name: 'inference connector',
          connectorId: '.id',
          config: { provider: 'elastic', inferenceId: '.google-gemini-2.5-pro-chat_completion' },
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        };
      });

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('omits the reasoning default when the model is unknown', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('propagates an explicit reasoning parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          tools: {
            foo: { description: 'my tool' },
          },
          toolChoice: ToolChoiceType.auto,
          reasoning: { effort: 'high', summary: 'concise' },
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            reasoning: { effort: 'high', summary: 'concise' },
          }),
        }),
      });
    });

    it('omits reasoning when tools are absent and reasoning is not provided', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            reasoning: expect.anything(),
          }),
        }),
      });
    });

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          signal: abortController.signal,
        }),
      });
    });

    it('uses the right value for functionCalling=auto', () => {
      isNativeFunctionCallingSupportedMock.mockReturnValue(false);

      inferenceAdapter
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
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.not.objectContaining({
            tools: expect.any(Array),
          }),
        }),
      });
    });

    it('propagates the modelName parameter', () => {
      inferenceAdapter
        .chatComplete({
          logger,
          executor: executorMock,
          messages: [{ role: MessageRole.User, content: 'question' }],
          modelName: 'gpt-4o',
        })
        .subscribe(noop);

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'unified_completion_stream',
        subActionParams: expect.objectContaining({
          body: expect.objectContaining({
            model: 'gpt-4o',
          }),
        }),
      });
    });

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
          inferenceAdapter
            .chatComplete({
              ...defaultArgs,
              messages: [{ role: MessageRole.User, content: 'Hello' }],
            })
            .pipe(toArray())
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error calling connector: something went wrong"`
      );
    });
  });
});
