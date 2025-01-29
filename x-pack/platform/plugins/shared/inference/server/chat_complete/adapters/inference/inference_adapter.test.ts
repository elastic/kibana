/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNativeFunctionCallingSupportedMock } from './inference_adapter.test.mocks';
import OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { lastValueFrom, Subject, toArray, filter } from 'rxjs';
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
import { InferenceExecutor } from '../../utils/inference_executor';
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
      const source$ = new Subject<Record<string, any>>();

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

      source$.next(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        })
      );

      source$.next(
        createOpenAIChunk({
          delta: {
            content: ', second',
          },
        })
      );

      source$.complete();

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
      const source$ = new Subject<Record<string, any>>();

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

      source$.next(
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

      source$.complete();

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
        },
      ]);
    });

    it('emits token count event when not provided by the response', async () => {
      const source$ = new Subject<Record<string, any>>();

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

      source$.next(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        })
      );

      source$.complete();

      const tokenChunks = await lastValueFrom(
        response$.pipe(filter(isChatCompletionTokenCountEvent), toArray())
      );

      expect(tokenChunks).toEqual([
        {
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            completion: expect.any(Number),
            prompt: expect.any(Number),
            total: expect.any(Number),
          },
        },
      ]);
    });

    it('propagates the temperature parameter', () => {
      inferenceAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        temperature: 0.4,
      });

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

    it('propagates the abort signal when provided', () => {
      const abortController = new AbortController();

      inferenceAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        abortSignal: abortController.signal,
      });

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

      inferenceAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        tools: {
          foo: { description: 'my tool' },
        },
        toolChoice: ToolChoiceType.auto,
        functionCalling: 'auto',
      });

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
      inferenceAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [{ role: MessageRole.User, content: 'question' }],
        modelName: 'gpt-4o',
      });

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
