/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInferenceExecutorMock,
  getInferenceAdapterMock,
  resolveInferenceEndpointMock,
  createInferenceEndpointExecutorMock,
  inferenceEndpointAdapterMock,
} from './api.test.mocks';

import { of, Subject, isObservable, toArray, firstValueFrom, filter } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
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
import { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';

describe('createChatCompleteApi', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let inferenceAdapter: ReturnType<typeof createInferenceConnectorAdapterMock>;
  let inferenceConnector: ReturnType<typeof createInferenceConnectorMock>;
  let inferenceExecutor: ReturnType<typeof createInferenceExecutorMock>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;
  let endpointIdCache: InferenceEndpointIdCache;

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
    inference: {
      get: jest.fn().mockResolvedValue({ endpoints: [] }),
    },
  } as any;
  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    regexWorker = createRegexWorkerServiceMock();
    endpointIdCache = new InferenceEndpointIdCache({ esClient: mockEsClient });
    const callbackApi = createChatCompleteCallbackApi({
      request,
      namespace: 'default',
      actions,
      logger,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
      endpointIdCache,
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
    resolveInferenceEndpointMock.mockReset();
    createInferenceEndpointExecutorMock.mockReset();
    inferenceEndpointAdapterMock.chatComplete.mockReset();
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
      esClient: mockEsClient,
      logger,
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
    const recoveringShardError = {
      statusCode: 503,
      meta: {
        statusCode: 503,
        body: {
          error: {
            type: 'illegal_index_shard_state_exception',
            reason:
              'CurrentState[RECOVERING] operations only allowed when shard state is one of [POST_RECOVERY, STARTED]',
          },
        },
      },
      message:
        'no_shard_available_action_exception: CurrentState[RECOVERING] operations only allowed when shard state is one of [POST_RECOVERY, STARTED]',
    };

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

    it('retries transient shard-recovery failures when fetching carried replacements', async () => {
      mockEsClient.get.mockRejectedValueOnce(recoveringShardError);
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

      expect(mockEsClient.get.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(mockEsClient.get.mock.calls[0][0]).toEqual(
        expect.objectContaining({ id: 'existing-replacements-id' })
      );
      expect(response.metadata?.anonymization?.replacementsId).toBe('existing-replacements-id');
    });

    it('does not retry non-retryable replacements errors', async () => {
      mockEsClient.get.mockRejectedValueOnce({
        statusCode: 400,
        meta: { statusCode: 400 },
        message: 'bad request',
      });
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      await expect(
        chatComplete({
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          metadata: {
            anonymization: {
              replacementsId: 'existing-replacements-id',
            },
          },
          maxRetries: 0,
        })
      ).rejects.toMatchObject({ message: 'bad request' });

      expect(mockEsClient.get).toHaveBeenCalledTimes(1);
      expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(0);
    });

    it('reuses carried replacementsId by creating document when carried one is missing', async () => {
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
      expect(mockEsClient.index.mock.calls[0][0]).toEqual(
        expect.objectContaining({ id: 'stale-replacements-id' })
      );
      expect(response.metadata?.anonymization?.replacementsId).toBe('stale-replacements-id');
    });

    it('fails when carried replacementsId belongs to another namespace', async () => {
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          id: 'cross-space-replacements-id',
          namespace: 'other-space',
          replacements: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'inference',
        },
      });
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      await expect(
        chatComplete({
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          metadata: {
            anonymization: {
              replacementsId: 'cross-space-replacements-id',
            },
          },
          maxRetries: 0,
        })
      ).rejects.toThrow(
        'Carried replacementsId "cross-space-replacements-id" does not belong to namespace "default"'
      );

      expect(mockEsClient.index).toHaveBeenCalledTimes(0);
      expect(mockEsClient.update).toHaveBeenCalledTimes(0);
      expect(inferenceAdapter.chatComplete).toHaveBeenCalledTimes(0);
    });

    it('handles create conflict by falling back to update', async () => {
      mockEsClient.get
        .mockRejectedValueOnce({ meta: { statusCode: 404 } })
        .mockResolvedValueOnce({
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            id: 'stale-replacements-id',
            namespace: 'default',
            replacements: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'inference',
          },
        })
        .mockResolvedValueOnce({
          _source: {
            id: 'stale-replacements-id',
            namespace: 'default',
            replacements: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'inference',
          },
        });
      mockEsClient.index.mockRejectedValueOnce({
        statusCode: 409,
        meta: { statusCode: 409 },
      });
      mockEsClient.update.mockResolvedValueOnce({});
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

      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      expect(mockEsClient.update).toHaveBeenCalledTimes(1);
      expect(response.metadata?.anonymization?.replacementsId).toBe('stale-replacements-id');
    });

    it('fails when create conflict fallback update cannot persist replacements', async () => {
      mockEsClient.get
        .mockRejectedValueOnce({ meta: { statusCode: 404 } })
        .mockRejectedValueOnce({ meta: { statusCode: 404 } });
      mockEsClient.index.mockRejectedValueOnce({
        statusCode: 409,
        meta: { statusCode: 409 },
      });
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('chunk-1')));

      await expect(
        chatComplete({
          connectorId: 'connectorId',
          messages: [{ role: MessageRole.User, content: 'question' }],
          metadata: {
            anonymization: {
              replacementsId: 'stale-replacements-id',
            },
          },
          maxRetries: 0,
        })
      ).rejects.toThrow(
        'Unable to persist replacements after create conflict for replacementsId "stale-replacements-id"'
      );

      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
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

    it('keeps masked output for Agent Builder requests while preserving replacements metadata', async () => {
      mockEsClient.get.mockResolvedValueOnce({
        _source: {
          id: 'existing-replacements-id',
          namespace: 'default',
          replacements: [{ anonymized: 'EMAIL_token', original: 'alice@example.com' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'inference',
        },
      });
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent('EMAIL_token')));

      const response = await chatComplete({
        connectorId: 'connectorId',
        messages: [{ role: MessageRole.User, content: 'alice@example.com' }],
        metadata: {
          connectorTelemetry: { pluginId: 'agent_builder' },
          anonymization: {
            replacementsId: 'existing-replacements-id',
          },
        },
        maxRetries: 0,
      });

      expect(response.content).toBe('EMAIL_token');
      expect(response.metadata?.anonymization?.replacementsId).toBe('existing-replacements-id');
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

  describe('inference endpoint path (via connectorId resolution)', () => {
    const mockEndpointExecutor = { invoke: jest.fn() };

    beforeEach(() => {
      mockEsClient.inference.get.mockResolvedValue({
        endpoints: [
          { inference_id: 'my-endpoint', task_type: 'chat_completion', service: 'openai' },
        ],
      });

      resolveInferenceEndpointMock.mockResolvedValue({
        inferenceId: 'my-endpoint',
        provider: 'openai',
        modelId: 'gpt-4o',
        taskType: 'chat_completion',
      });
      createInferenceEndpointExecutorMock.mockReturnValue(mockEndpointExecutor);
      inferenceEndpointAdapterMock.chatComplete.mockReturnValue(of(chunkEvent('endpoint-chunk')));
    });

    it('does NOT call actionsClient or getInferenceExecutor when connectorId resolves to inference endpoint', async () => {
      await chatComplete({
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(getInferenceExecutorMock).not.toHaveBeenCalled();
      expect(getInferenceAdapterMock).not.toHaveBeenCalled();
    });

    it('calls resolveInferenceEndpoint with the correct parameters', async () => {
      await chatComplete({
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(resolveInferenceEndpointMock).toHaveBeenCalledWith({
        inferenceId: 'my-endpoint',
        esClient: mockEsClient,
      });
    });

    it('calls createInferenceEndpointExecutor with the correct parameters', async () => {
      await chatComplete({
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(createInferenceEndpointExecutorMock).toHaveBeenCalledWith({
        inferenceId: 'my-endpoint',
        esClient: mockEsClient,
      });
    });

    it('calls the inference endpoint adapter with the correct parameters', async () => {
      await chatComplete({
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        temperature: 0.5,
        modelName: 'gpt-4o-mini',
        maxRetries: 0,
      });

      expect(inferenceEndpointAdapterMock.chatComplete).toHaveBeenCalledTimes(1);
      expect(inferenceEndpointAdapterMock.chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: MessageRole.User, content: 'question' }],
          executor: mockEndpointExecutor,
          temperature: 0.5,
          modelName: 'gpt-4o-mini',
          logger,
        })
      );
    });

    it('returns a promise with the response in non-stream mode', async () => {
      const response = await chatComplete({
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(response).toEqual({
        content: 'endpoint-chunk',
        metadata: undefined,
        toolCalls: [],
      });
    });

    it('returns an observable in stream mode', async () => {
      inferenceEndpointAdapterMock.chatComplete.mockReturnValue(
        of(chunkEvent('chunk-1'), chunkEvent('chunk-2'))
      );

      const events$ = chatComplete({
        stream: true,
        connectorId: 'my-endpoint',
        messages: [{ role: MessageRole.User, content: 'question' }],
        maxRetries: 0,
      });

      expect(isObservable(events$)).toBe(true);

      const events = await firstValueFrom(
        events$.pipe(filter(isChatCompletionChunkEvent), toArray())
      );
      expect(events).toHaveLength(2);
      expect(events[0].content).toBe('chunk-1');
      expect(events[1].content).toBe('chunk-2');
    });
  });
});
