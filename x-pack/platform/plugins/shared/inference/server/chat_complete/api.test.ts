/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceExecutorMock, getInferenceAdapterMock } from './api.test.mocks';

import { of, Subject, isObservable, toArray, firstValueFrom } from 'rxjs';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  type ChatCompleteAPI,
  type ChatCompletionChunkEvent,
  MessageRole,
} from '@kbn/inference-common';
import {
  createInferenceConnectorAdapterMock,
  createInferenceConnectorMock,
  createInferenceExecutorMock,
  chunkEvent,
} from '../test_utils';
import { createChatCompleteApi } from './api';

describe('createChatCompleteApi', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let inferenceAdapter: ReturnType<typeof createInferenceConnectorAdapterMock>;
  let inferenceConnector: ReturnType<typeof createInferenceConnectorMock>;
  let inferenceExecutor: ReturnType<typeof createInferenceExecutorMock>;

  let chatComplete: ChatCompleteAPI;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();

    chatComplete = createChatCompleteApi({ request, actions, logger });

    inferenceAdapter = createInferenceConnectorAdapterMock();
    inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));
    getInferenceAdapterMock.mockReturnValue(inferenceAdapter);

    inferenceConnector = createInferenceConnectorMock();

    inferenceExecutor = createInferenceExecutorMock({ connector: inferenceConnector });
    getInferenceExecutorMock.mockResolvedValue(inferenceExecutor);
  });

  afterEach(() => {
    getInferenceExecutorMock.mockReset();
    getInferenceAdapterMock.mockReset();
  });

  it('calls `getInferenceExecutor` with the right parameters', async () => {
    await chatComplete({
      connectorId: 'connectorId',
      messages: [{ role: MessageRole.User, content: 'question' }],
    });

    expect(getInferenceExecutorMock).toHaveBeenCalledTimes(1);
    expect(getInferenceExecutorMock).toHaveBeenCalledWith({
      connectorId: 'connectorId',
      request,
      actions,
    });
  });

  it('calls `getInferenceAdapter` with the right parameters', async () => {
    await chatComplete({
      connectorId: 'connectorId',
      messages: [{ role: MessageRole.User, content: 'question' }],
    });

    expect(getInferenceAdapterMock).toHaveBeenCalledTimes(1);
    expect(getInferenceAdapterMock).toHaveBeenCalledWith(inferenceConnector.type);
  });

  it('calls `inferenceAdapter.chatComplete` with the right parameters', async () => {
    await chatComplete({
      connectorId: 'connectorId',
      messages: [{ role: MessageRole.User, content: 'question' }],
      temperature: 0.7,
      modelName: 'gpt-4o',
    });

    expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(1);
    expect(inferenceAdapter.chatComplete).toHaveBeenCalledWith({
      messages: [{ role: MessageRole.User, content: 'question' }],
      executor: inferenceExecutor,
      logger,
      temperature: 0.7,
      modelName: 'gpt-4o',
    });
  });

  it('throws if the connector is not compatible', async () => {
    getInferenceAdapterMock.mockReturnValue(undefined);

    await expect(
      chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Adapter for type .gen-ai not implemented"`);
  });

  describe('response mode', () => {
    it('returns a promise resolving with the response', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(
        of(chunkEvent('chunk-1'), chunkEvent('chunk-2'))
      );

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
      });

      expect(response).toEqual({
        content: 'chunk-1chunk-2',
        toolCalls: [],
      });
    });

    describe('request cancellation', () => {
      it('passes the abortSignal down to `inferenceAdapter.chatComplete`', async () => {
        const abortController = new AbortController();

        await chatComplete({
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        });

        expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(1);
        expect(inferenceAdapter.chatComplete).toHaveBeenCalledWith({
          messages: [{ role: MessageRole.User, content: 'question' }],
          executor: inferenceExecutor,
          abortSignal: abortController.signal,
          logger,
        });
      });

      it('throws an error when the signal is triggered', async () => {
        const abortController = new AbortController();

        const subject = new Subject<ChatCompletionChunkEvent>();
        inferenceAdapter.chatComplete.mockReturnValue(subject.asObservable());

        subject.next(chunkEvent('chunk-1'));

        let caughtError: any;

        const promise = chatComplete({
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        }).catch((err) => {
          caughtError = err;
        });

        abortController.abort();

        await promise;

        expect(caughtError).toBeInstanceOf(Error);
        expect(caughtError.message).toContain('Request was aborted');
      });
    });
  });

  describe('stream mode', () => {
    it('returns an observable of events', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(
        of(chunkEvent('chunk-1'), chunkEvent('chunk-2'))
      );

      const events$ = chatComplete({
        stream: true,
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
      });

      expect(isObservable(events$)).toBe(true);

      const events = await firstValueFrom(events$.pipe(toArray()));
      expect(events).toEqual([
        {
          content: 'chunk-1',
          tool_calls: [],
          type: 'chatCompletionChunk',
        },
        {
          content: 'chunk-2',
          tool_calls: [],
          type: 'chatCompletionChunk',
        },
        {
          content: 'chunk-1chunk-2',
          toolCalls: [],
          type: 'chatCompletionMessage',
        },
      ]);
    });

    describe('request cancellation', () => {
      it('throws an error when the signal is triggered', async () => {
        const abortController = new AbortController();

        const subject = new Subject<ChatCompletionChunkEvent>();
        inferenceAdapter.chatComplete.mockReturnValue(subject.asObservable());

        subject.next(chunkEvent('chunk-1'));

        let caughtError: any;

        const events$ = chatComplete({
          stream: true,
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          abortSignal: abortController.signal,
        });

        events$.subscribe({
          error: (err: any) => {
            caughtError = err;
          },
        });

        abortController.abort();

        expect(caughtError).toBeInstanceOf(Error);
        expect(caughtError.message).toContain('Request was aborted');
      });
    });
  });
});
