/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { lastValueFrom, Subject, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
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
    invoke: jest.fn(),
  } as InferenceExecutor & { invoke: jest.MockedFn<InferenceExecutor['invoke']> };

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    executorMock.invoke.mockReset();
  });

  const defaultArgs = {
    executor: executorMock,
    logger: loggerMock.create(),
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

      const allChunks = await lastValueFrom(response$.pipe(toArray()));

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
  });
});
