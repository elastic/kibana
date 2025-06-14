/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, isObservable, of, toArray } from 'rxjs';
import {
  ChatCompleteResponse,
  ChatCompletionEvent,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import { createOutputApi } from './create_output_api';
import { createToolValidationError } from '../chat_complete/errors';

describe('createOutputApi', () => {
  let chatComplete: jest.Mock;

  beforeEach(() => {
    chatComplete = jest.fn();
  });

  it('calls `chatComplete` with the right parameters', async () => {
    chatComplete.mockResolvedValue(Promise.resolve({ content: 'content', toolCalls: [] }));

    const output = createOutputApi(chatComplete);

    await output({
      id: 'id',
      stream: false,
      functionCalling: 'native',
      connectorId: '.my-connector',
      system: 'system',
      input: 'input message',
      modelName: 'gpt-4o',
    });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith({
      connectorId: '.my-connector',
      functionCalling: 'native',
      modelName: 'gpt-4o',
      stream: false,
      system: 'system',
      messages: [
        {
          content: 'input message',
          role: 'user',
        },
      ],
    });
  });

  it('returns the expected value when stream=false', async () => {
    const chatCompleteResponse: ChatCompleteResponse = {
      content: 'content',
      toolCalls: [{ toolCallId: 'a', function: { name: 'foo', arguments: { arg: 1 } } }],
    };

    chatComplete.mockResolvedValue(Promise.resolve(chatCompleteResponse));

    const output = createOutputApi(chatComplete);

    const response = await output({
      id: 'my-id',
      stream: false,
      connectorId: '.my-connector',
      input: 'input message',
    });

    expect(response).toEqual({
      id: 'my-id',
      content: chatCompleteResponse.content,
      output: chatCompleteResponse.toolCalls[0].function.arguments,
    });
  });

  it('returns the expected value when stream=true', async () => {
    const sourceEvents: ChatCompletionEvent[] = [
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk-1', tool_calls: [] },
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk-2', tool_calls: [] },
      {
        type: ChatCompletionEventType.ChatCompletionMessage,
        content: 'message',
        toolCalls: [{ toolCallId: 'a', function: { name: 'foo', arguments: { arg: 1 } } }],
      },
    ];

    chatComplete.mockReturnValue(of(...sourceEvents));

    const output = createOutputApi(chatComplete);

    const response$ = await output({
      id: 'my-id',
      stream: true,
      connectorId: '.my-connector',
      input: 'input message',
    });

    expect(isObservable(response$)).toEqual(true);
    const events = await firstValueFrom(response$.pipe(toArray()));

    expect(events).toEqual([
      {
        content: 'chunk-1',
        id: 'my-id',
        type: 'output',
      },
      {
        content: 'chunk-2',
        id: 'my-id',
        type: 'output',
      },
      {
        content: 'message',
        id: 'my-id',
        output: {
          arg: 1,
        },
        type: 'complete',
      },
    ]);
  });

  describe('when using retry', () => {
    const unvalidatedFailedToolCall = {
      function: {
        name: 'myFunction',
        arguments: JSON.stringify({ foo: 'bar' }),
      },
      toolCallId: 'foo',
    };

    const validationError = createToolValidationError('Validation failed', {
      toolCalls: [unvalidatedFailedToolCall],
    });

    it('retries once when onValidationError is a boolean', async () => {
      chatComplete.mockRejectedValueOnce(validationError);
      chatComplete.mockResolvedValueOnce(
        Promise.resolve({ content: 'retried content', toolCalls: [unvalidatedFailedToolCall] })
      );

      const output = createOutputApi(chatComplete);

      const response = await output({
        id: 'retry-id',
        stream: false,
        connectorId: '.retry-connector',
        input: 'input message',
        retry: {
          onValidationError: true,
        },
      });

      expect(chatComplete).toHaveBeenCalledTimes(2);
      expect(response).toEqual({
        id: 'retry-id',
        content: 'retried content',
        output: unvalidatedFailedToolCall.function.arguments,
      });
    });

    it('retries the number of specified attempts', async () => {
      chatComplete.mockRejectedValue(validationError);

      const output = createOutputApi(chatComplete);

      await expect(
        output({
          id: 'retry-id',
          stream: false,
          connectorId: '.retry-connector',
          input: 'input message',
          retry: {
            onValidationError: 2,
          },
        })
      ).rejects.toThrow('Validation failed');

      expect(chatComplete).toHaveBeenCalledTimes(3);
    });

    it('throws an error if retry is provided in streaming mode', () => {
      const output = createOutputApi(chatComplete);

      expect(() =>
        output({
          id: 'stream-retry-id',
          stream: true,
          connectorId: '.stream-retry-connector',
          input: 'input message',
          retry: {
            onValidationError: 1,
          },
        })
      ).toThrowError('Retry options are not supported in streaming mode');
    });
  });

  it('propagates the abort signal when provided', async () => {
    chatComplete.mockResolvedValue(Promise.resolve({ content: 'content', toolCalls: [] }));

    const output = createOutputApi(chatComplete);

    const abortController = new AbortController();

    await output({
      id: 'id',
      connectorId: '.my-connector',
      input: 'input message',
      abortSignal: abortController.signal,
    });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: abortController.signal,
      })
    );
  });

  it('propagates retry options when provided', async () => {
    chatComplete.mockResolvedValue(Promise.resolve({ content: 'content', toolCalls: [] }));

    const output = createOutputApi(chatComplete);

    await output({
      id: 'id',
      connectorId: '.my-connector',
      input: 'input message',
      maxRetries: 42,
      retryConfiguration: {
        retryOn: 'all',
      },
    });

    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRetries: 42,
        retryConfiguration: {
          retryOn: 'all',
        },
      })
    );
  });
});
