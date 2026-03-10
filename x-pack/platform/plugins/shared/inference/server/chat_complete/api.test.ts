/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceExecutorMock, getInferenceAdapterMock } from './api.test.mocks';

import { of, Subject, isObservable, toArray, firstValueFrom, filter } from 'rxjs';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  type ChatCompleteAPI,
  type ChatCompletionChunkEvent,
  MessageRole,
  isChatCompletionChunkEvent,
} from '@kbn/inference-common';
import {
  createInferenceConnectorAdapterMock,
  createInferenceConnectorMock,
  createInferenceExecutorMock,
  createRegexWorkerServiceMock,
  chunkEvent,
} from '../test_utils';
import { createChatCompleteApi } from './api';
import { createChatCompleteCallbackApi } from './callback_api';

describe('createChatCompleteApi', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let inferenceAdapter: ReturnType<typeof createInferenceConnectorAdapterMock>;
  let inferenceConnector: ReturnType<typeof createInferenceConnectorMock>;
  let inferenceExecutor: ReturnType<typeof createInferenceExecutorMock>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;

  let chatComplete: ChatCompleteAPI;
  const mockEsClient = {
    get: jest.fn().mockResolvedValue({
      _source: {
        id: 'existing-replacements-id',
        namespace: 'default',
        replacements: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'inference',
      },
    }),
    index: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({}),
    },
    ml: {
      inferTrainedModel: jest.fn(),
    },
  } as any;
  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    regexWorker = createRegexWorkerServiceMock();
    const callbackApi = createChatCompleteCallbackApi({
      request,
      namespace: 'default',
      actions,
      logger,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
    });
    chatComplete = createChatCompleteApi({
      callbackApi,
    });

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
    mockEsClient.get.mockClear();
    mockEsClient.index.mockClear();
    mockEsClient.update.mockClear();
  });

  it('calls `getInferenceExecutor` with the right parameters', async () => {
    await chatComplete({
      connectorId: 'connectorId',
      messages: [{ role: MessageRole.User, content: 'question' }],
      maxRetries: 0,
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
      maxRetries: 0,
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
      maxRetries: 0,
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
        maxRetries: 0,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Adapter for type .gen-ai not implemented"`);
  });

  describe('response mode', () => {
    it('reuses carried replacementsId when found', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
        metadata: {
          anonymization: {
            replacementsId: 'existing-replacements-id',
          },
        },
        maxRetries: 0,
      });

      expect(mockEsClient.get).toHaveBeenCalled();
      expect(mockEsClient.get.mock.calls[0][0]).toEqual(
        expect.objectContaining({ id: 'existing-replacements-id' })
      );
      expect(mockEsClient.update).toHaveBeenCalledTimes(1);
      expect(mockEsClient.index).toHaveBeenCalledTimes(0);
      expect(response.metadata?.anonymization?.replacementsId).toBe('existing-replacements-id');
    });

    it('falls back to a new replacementsId when carried one is missing', async () => {
      mockEsClient.get.mockRejectedValueOnce({ meta: { statusCode: 404 } });
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
        metadata: {
          anonymization: {
            replacementsId: 'stale-replacements-id',
          },
        },
        maxRetries: 0,
      });

      expect(mockEsClient.get).toHaveBeenCalledTimes(1);
      expect(mockEsClient.update).toHaveBeenCalledTimes(0);
      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      expect(response.metadata?.anonymization?.replacementsId).not.toBe('stale-replacements-id');
      expect(response.metadata?.anonymization?.replacementsId).toEqual(expect.any(String));
    });

    it('does not persist replacements when there is no anonymization and no carried id', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      const turn1 = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'turn-1' }],
        maxRetries: 0,
      });

      await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'turn-2' }],
        maxRetries: 0,
      });

      expect(turn1.metadata?.anonymization?.replacementsId).toBeUndefined();
      expect(mockEsClient.get).toHaveBeenCalledTimes(0);
      expect(mockEsClient.index).toHaveBeenCalledTimes(0);
      expect(mockEsClient.update).toHaveBeenCalledTimes(0);
    });

    it('returns a promise resolving with the response', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(
        of(chunkEvent('chunk-1'), chunkEvent('chunk-2'))
      );

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(response).toEqual({
        content: 'chunk-1chunk-2',
        metadata: undefined,
        toolCalls: [],
      });
    });

    it('implicitly retries errors when configured to', async () => {
      let count = 0;
      inferenceAdapter.chatComplete.mockImplementation(() => {
        if (++count < 3) {
          throw new Error(`Failing on attempt ${count}`);
        }
        return of(chunkEvent('chunk-1'), chunkEvent('chunk-2'));
      });

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 2,
        retryConfiguration: {
          retryOn: 'all',
          initialDelay: 1,
          backoffMultiplier: 1,
        },
      });

      expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(3);

      expect(response).toEqual({
        content: 'chunk-1chunk-2',
        metadata: undefined,
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
          maxRetries: 0,
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
          maxRetries: 1,
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
        maxRetries: 0,
      });

      expect(isObservable(events$)).toBe(true);

      const events = await firstValueFrom(events$.pipe(toArray()));
      expect(events).toEqual([
        {
          content: 'chunk-1',
          metadata: undefined,
          tool_calls: [],
          type: 'chatCompletionChunk',
        },
        {
          content: 'chunk-2',
          metadata: undefined,
          tool_calls: [],
          type: 'chatCompletionChunk',
        },
        {
          content: 'chunk-1chunk-2',
          metadata: undefined,
          toolCalls: [],
          type: 'chatCompletionMessage',
        },
      ]);
    });

    it('implicitly retries errors when configured to', async () => {
      let count = 0;
      inferenceAdapter.chatComplete.mockImplementation(() => {
        count++;
        if (count < 3) {
          throw new Error(`Failing on attempt ${count}`);
        }
        return of(chunkEvent('chunk-1'), chunkEvent('chunk-2'));
      });

      const events$ = chatComplete({
        stream: true,
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 2,
        retryConfiguration: {
          retryOn: 'all',
          initialDelay: 1,
          backoffMultiplier: 1,
        },
      });

      const events = await firstValueFrom(
        events$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );

      expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(3);

      expect(events).toEqual([
        {
          content: 'chunk-1',
          metadata: undefined,
          tool_calls: [],
          type: 'chatCompletionChunk',
        },
        {
          content: 'chunk-2',
          metadata: undefined,
          tool_calls: [],
          type: 'chatCompletionChunk',
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
          maxRetries: 0,
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
