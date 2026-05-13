/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { HookResult } from '@kbn/workflows/server/types';
import { MessageRole } from '@kbn/inference-common';
import type { ChatCompleteOptions } from '@kbn/inference-common';
import { invokeAroundCompletion } from './invoke_around_completion';
import { InferenceAnonymizationUnavailableError } from '../anonymization/errors';
import type { AnonymizationContext } from '../anonymization/context';
import type { InferenceConfig } from '../config';

const logger = loggingSystemMock.createLogger();

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

const messages: ChatCompleteOptions['messages'] = [{ role: MessageRole.User, content: 'hello' }];

const makeHookInvoker =
  (
    result: Pick<HookResult, 'status'> & Partial<HookResult>,
    simulateAnonymization?: (ctx: AnonymizationContext) => void
  ) =>
  async (
    _triggerId: string,
    _payload: Record<string, unknown>,
    capabilities?: Record<string, unknown>
  ): Promise<HookResult> => {
    if (simulateAnonymization && capabilities?.anonymizationContext) {
      simulateAnonymization(capabilities.anonymizationContext as AnonymizationContext);
    }
    return { output: {}, error: undefined, ...result } as HookResult;
  };

describe('invokeAroundCompletion', () => {
  describe('happy path', () => {
    it('returns anonymized inputs written by ai.pii steps via setField', async () => {
      const hookInvoker = makeHookInvoker({ status: 'completed' }, (ctx) => {
        ctx.setField('system', 'anon-system');
        ctx.setField('messages', [{ role: 'user', content: 'anon message' }]);
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'sess-1' } },
        system: 'original system',
        messages,
      });

      expect(result.kind).toBe('streaming');
      if (result.kind !== 'streaming') throw new Error('Expected streaming result');
      expect(result.anonymizedSystem).toContain('anon-system');
      expect(result.anonymizedMessages).toEqual([{ role: 'user', content: 'anon message' }]);
      expect(result.sessionId).toBe('sess-1');
    });

    it('falls back to original system/messages when steps set no fields', async () => {
      const hookInvoker = makeHookInvoker({ status: 'completed' });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'abc' } },
        system: 'original-sys',
        messages,
      });

      expect(result.kind).toBe('streaming');
      if (result.kind !== 'streaming') throw new Error('Expected streaming result');
      expect(result.anonymizedSystem).toBe('original-sys');
      expect(result.anonymizedMessages).toBe(messages);
    });

    it('populates tokenMap so caller can restore tokens in the streamed response', async () => {
      const token = 'IP_aabbccdd00112233445566778899aabb';
      const hookInvoker = makeHookInvoker({ status: 'completed' }, (ctx) => {
        ctx.tokenMap.set(token, { original: '192.168.1.50', entityClass: 'IP' });
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'sess-restore' } },
        system: undefined,
        messages,
      });

      expect(result.anonymizationContext.tokenMap.get(token)?.original).toBe('192.168.1.50');
    });

    it('injects anonymization instruction into system when tokens are produced', async () => {
      const token = 'IP_aabbccdd00112233445566778899aabb';
      const hookInvoker = makeHookInvoker({ status: 'completed' }, (ctx) => {
        ctx.setField('system', 'anon-system');
        ctx.tokenMap.set(token, { original: '192.168.1.50', entityClass: 'IP' });
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'sess-instr' } },
        system: 'original',
        messages,
      });

      expect(result.kind).toBe('streaming');
      if (result.kind !== 'streaming') throw new Error('Expected streaming result');
      expect(result.anonymizedSystem).toContain('anon-system');
      expect(result.anonymizedSystem).toContain('[Anonymization context]');
    });

    it('uses a generated sessionId when metadata does not supply one', async () => {
      const hookInvoker = makeHookInvoker({ status: 'completed' });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: undefined,
        system: undefined,
        messages,
      });

      expect(typeof result.sessionId).toBe('string');
      expect(result.sessionId.length).toBeGreaterThan(0);
    });

    it('uses the provided sessionId when given explicitly', async () => {
      const hookInvoker = makeHookInvoker({ status: 'completed' });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: undefined,
        system: undefined,
        messages,
        sessionId: 'explicit-session',
      });

      expect(result.sessionId).toBe('explicit-session');
    });

    it('passes sessionId and raw system/messages to the hook payload', async () => {
      const capturedPayload: Record<string, unknown>[] = [];
      const hookInvoker = async (
        _triggerId: string,
        payload: Record<string, unknown>
      ): Promise<HookResult> => {
        capturedPayload.push(payload);
        return { status: 'completed', output: {} };
      };

      await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'abc' } },
        system: 'sys',
        messages,
      });

      expect(capturedPayload[0]).toMatchObject({ sessionId: 'abc', system: 'sys', messages });
    });

    it('passes anonymizationContext as capability', async () => {
      const capturedCapabilities: Record<string, unknown>[] = [];
      const hookInvoker = async (
        _triggerId: string,
        _payload: Record<string, unknown>,
        capabilities?: Record<string, unknown>
      ): Promise<HookResult> => {
        if (capabilities) capturedCapabilities.push(capabilities);
        return { status: 'completed', output: {} };
      };

      await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: undefined,
        system: undefined,
        messages,
      });

      expect(capturedCapabilities[0]).toHaveProperty('anonymizationContext');
    });
  });

  describe('failure handling — failureMode: block (default)', () => {
    it('throws InferenceAnonymizationUnavailableError when hook returns failed', async () => {
      const hookInvoker = makeHookInvoker({ status: 'failed', error: 'regex timeout' });

      await expect(
        invokeAroundCompletion({
          anonymizationHookInvoker: hookInvoker,
          config: makeConfig({ failureMode: 'block' }),
          logger,
          metadata: undefined,
          system: undefined,
          messages,
        })
      ).rejects.toThrow(InferenceAnonymizationUnavailableError);
    });
  });

  describe('failure handling — failureMode: allow_unsafe', () => {
    it('returns original inputs when hook fails', async () => {
      const hookInvoker = makeHookInvoker({ status: 'failed', error: 'hook crashed' });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig({ failureMode: 'allow_unsafe' }),
        logger,
        metadata: undefined,
        system: 'original-sys',
        messages,
      });

      expect(result.kind).toBe('streaming');
      if (result.kind !== 'streaming') throw new Error('Expected streaming result');
      expect(result.anonymizedSystem).toBe('original-sys');
      expect(result.anonymizedMessages).toBe(messages);
    });
  });

  describe('buffered path (call_site.proceed)', () => {
    it('returns kind: buffered when the hook result contains a response string', async () => {
      const hookInvoker = async (): Promise<import('@kbn/workflows/server/types').HookResult> => ({
        status: 'completed',
        output: { response: 'anonymized LLM response' },
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'buf-1' } },
        system: 'sys',
        messages,
      });

      expect(result.kind).toBe('buffered');
      if (result.kind !== 'buffered') throw new Error('Expected buffered result');
      expect(result.finalResponse).toBe('anonymized LLM response');
      expect(result.sessionId).toBe('buf-1');
    });

    it('passes proceedFn as a capability when provided', async () => {
      const capturedCapabilities: Array<Record<string, unknown>> = [];
      const hookInvoker = async (
        _triggerId: string,
        _payload: Record<string, unknown>,
        capabilities?: Record<string, unknown>
      ): Promise<import('@kbn/workflows/server/types').HookResult> => {
        if (capabilities) capturedCapabilities.push(capabilities);
        return { status: 'completed', output: {} };
      };

      const proceedFn = async () => ({ response: 'test' });

      await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: undefined,
        system: undefined,
        messages,
        proceedFn,
      });

      expect(capturedCapabilities[0]).toHaveProperty('proceedFn', proceedFn);
    });

    it('does not include proceedFn capability when not provided', async () => {
      const capturedCapabilities: Array<Record<string, unknown>> = [];
      const hookInvoker = async (
        _triggerId: string,
        _payload: Record<string, unknown>,
        capabilities?: Record<string, unknown>
      ): Promise<import('@kbn/workflows/server/types').HookResult> => {
        if (capabilities) capturedCapabilities.push(capabilities);
        return { status: 'completed', output: {} };
      };

      await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: undefined,
        system: undefined,
        messages,
      });

      expect(capturedCapabilities[0]).not.toHaveProperty('proceedFn');
    });
  });

  describe('pass_through status', () => {
    it('returns original inputs on pass_through', async () => {
      const hookInvoker = makeHookInvoker({ status: 'pass_through' });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'pt-sess' } },
        system: 'sys',
        messages,
      });

      expect(result.kind).toBe('streaming');
      if (result.kind !== 'streaming') throw new Error('Expected streaming result');
      expect(result.anonymizedSystem).toBe('sys');
      expect(result.anonymizedMessages).toBe(messages);
      expect(result.sessionId).toBe('pt-sess');
    });
  });
});
