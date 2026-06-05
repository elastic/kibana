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

import { of, throwError, firstValueFrom, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import type { ChatCompletionEvent, ChatCompletionChunkEvent } from '@kbn/inference-common';
import type { HookResult } from '@kbn/workflows/server/types';
import {
  createInferenceConnectorAdapterMock,
  createInferenceConnectorMock,
  createInferenceExecutorMock,
  createRegexWorkerServiceMock,
  chunkEvent,
} from '../test_utils';
import { createChatCompleteCallbackApi } from './callback_api';
import { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import type { InferenceConfig } from '../config';
import type { InvokeHookFn } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeConfig = (overrides?: Partial<InferenceConfig['anonymization']>): InferenceConfig =>
  ({
    enabled: true,
    workers: {
      anonymization: {
        enabled: true,
        minThreads: 0,
        maxThreads: 1,
        maxQueue: 10,
        idleTimeout: 30000,
        taskTimeout: 15000,
      },
    },
    anonymization: {
      experimental_workflow_driven: true,
      failureMode: 'block',
      maxTokensPerCall: 1_000_000,
      ...overrides,
    },
  } as unknown as InferenceConfig);

// A valid token: ENTITY_CLASS_<32 lower-case hex chars>
const TOKEN = 'IP_aabbccdd11223344aabbccdd11223344';
const ORIGINAL_IP = '10.20.30.40';
const TOKEN_MAP = { [TOKEN]: { original: ORIGINAL_IP, entityClass: 'IP' } };

/**
 * Hook invoker that:
 *  - passes through inference.beforeCompletion (no-op)
 *  - drives inference.aroundCompletion by calling proceedFn with the token map,
 *    then returns the assembled response as output.result
 */
const makeDrivingHookInvoker =
  (): InvokeHookFn =>
  async (triggerId, payload, capabilities): Promise<HookResult> => {
    if (triggerId === 'inference.beforeCompletion') {
      return { status: 'pass_through', output: {} };
    }
    if (triggerId === 'inference.aroundCompletion') {
      const proceedFn = capabilities?.proceedFn as (
        input: Record<string, unknown>
      ) => Promise<Record<string, unknown>>;
      const result = await proceedFn({
        system: payload.system,
        messages: payload.messages,
        tokenMap: TOKEN_MAP,
      });
      return {
        status: 'completed',
        output: { result: result.response, tokenMap: TOKEN_MAP },
      };
    }
    return { status: 'pass_through', output: {} };
  };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createChatCompleteCallbackApi — dual-channel aroundCompletion hook', () => {
  const mockEsClient = {
    ml: { inferTrainedModel: jest.fn() },
    inference: { get: jest.fn().mockResolvedValue({ endpoints: [] }) },
  } as any;

  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: ReturnType<typeof loggerMock.create>;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let inferenceAdapter: ReturnType<typeof createInferenceConnectorAdapterMock>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;
  let endpointIdCache: InferenceEndpointIdCache;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    regexWorker = createRegexWorkerServiceMock();
    endpointIdCache = new InferenceEndpointIdCache({ esClient: mockEsClient });

    inferenceAdapter = createInferenceConnectorAdapterMock();
    getInferenceAdapterMock.mockReturnValue(inferenceAdapter);

    const inferenceConnector = createInferenceConnectorMock();
    const inferenceExecutor = createInferenceExecutorMock({ connector: inferenceConnector });
    getInferenceExecutorMock.mockResolvedValue(inferenceExecutor);
  });

  afterEach(() => {
    getInferenceExecutorMock.mockReset();
    getInferenceAdapterMock.mockReset();
    resolveInferenceEndpointMock.mockReset();
    createInferenceEndpointExecutorMock.mockReset();
    inferenceEndpointAdapterMock.chatComplete.mockReset();
  });

  const makeCallbackApi = (hookInvoker: InvokeHookFn) =>
    createChatCompleteCallbackApi({
      request,
      namespace: 'default',
      actions,
      logger,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
      endpointIdCache,
      anonymizationHookInvoker: hookInvoker,
      config: makeConfig(),
    });

  describe('streaming path', () => {
    it('relays de-anonymized chunks in real time before the final message', async () => {
      // Adapter emits two chunks containing the anonymized IP token
      inferenceAdapter.chatComplete.mockReturnValue(
        of(chunkEvent(`host ${TOKEN} down`), chunkEvent(' check logs'))
      );

      const callbackApi = makeCallbackApi(makeDrivingHookInvoker());
      const stream$ = callbackApi(
        { connectorId: 'connector-1', stream: true, maxRetries: 0 },
        () => ({ messages: [{ role: MessageRole.User, content: 'check' }] })
      ) as Observable<ChatCompletionEvent>;

      const events = await firstValueFrom(stream$.pipe(toArray()));

      const chunks = events.filter(
        (e): e is ChatCompletionChunkEvent => e.type === ChatCompletionEventType.ChatCompletionChunk
      );

      // At least one chunk must be emitted
      expect(chunks.length).toBeGreaterThan(0);

      const chunkContent = chunks.map((c) => c.content ?? '').join('');

      // The raw token must not appear in the streamed chunks
      expect(chunkContent).not.toContain(TOKEN);
      // The original IP must be present
      expect(chunkContent).toContain(ORIGINAL_IP);
    });

    it('emits all chunk events before the final ChatCompletionMessage', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(
        of(chunkEvent('a '), chunkEvent('b '), chunkEvent('c'))
      );

      const callbackApi = makeCallbackApi(makeDrivingHookInvoker());
      const stream$ = callbackApi(
        { connectorId: 'connector-1', stream: true, maxRetries: 0 },
        () => ({ messages: [{ role: MessageRole.User, content: 'hi' }] })
      ) as Observable<ChatCompletionEvent>;

      const events = await firstValueFrom(stream$.pipe(toArray()));
      const types = events.map((e) => e.type);

      const messageIdx = types.lastIndexOf(ChatCompletionEventType.ChatCompletionMessage);
      const lastChunkIdx = types.lastIndexOf(ChatCompletionEventType.ChatCompletionChunk);

      expect(messageIdx).toBeGreaterThan(-1);
      if (lastChunkIdx !== -1) {
        expect(messageIdx).toBeGreaterThan(lastChunkIdx);
      }
    });

    it('final ChatCompletionMessage content comes from workflow output.result', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent(TOKEN)));

      const callbackApi = makeCallbackApi(makeDrivingHookInvoker());
      const stream$ = callbackApi(
        { connectorId: 'connector-1', stream: true, maxRetries: 0 },
        () => ({ messages: [{ role: MessageRole.User, content: 'hi' }] })
      ) as Observable<ChatCompletionEvent>;

      const events = await firstValueFrom(stream$.pipe(toArray()));
      const finalMessage = events.find(
        (e) => e.type === ChatCompletionEventType.ChatCompletionMessage
      ) as { content?: string } | undefined;

      expect(finalMessage).toBeDefined();
      // The workflow pii_restore step would have produced the restored IP;
      // our test hook returns result.response (already restored by restoreTokensOperator)
      expect(finalMessage?.content).toContain(ORIGINAL_IP);
    });
  });

  describe('non-streaming path', () => {
    it('returns a response whose content is the de-anonymized workflow output', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(of(chunkEvent(TOKEN)));

      const callbackApi = makeCallbackApi(makeDrivingHookInvoker());
      const response = (await callbackApi(
        { connectorId: 'connector-1', stream: false, maxRetries: 0 },
        () => ({ messages: [{ role: MessageRole.User, content: 'hi' }] })
      )) as { content: string };

      expect(response.content).toContain(ORIGINAL_IP);
    });
  });

  describe('error handling', () => {
    it('errors the stream when the LLM call fails (failureMode: block)', async () => {
      inferenceAdapter.chatComplete.mockReturnValue(
        throwError(() => new Error('upstream connector error'))
      );

      const callbackApi = makeCallbackApi(makeDrivingHookInvoker());
      const stream$ = callbackApi(
        { connectorId: 'connector-1', stream: true, maxRetries: 0 },
        () => ({ messages: [{ role: MessageRole.User, content: 'hi' }] })
      ) as Observable<ChatCompletionEvent>;

      await expect(firstValueFrom(stream$.pipe(toArray()))).rejects.toThrow();
    });
  });
});
