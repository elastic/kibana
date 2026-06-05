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
  (result: Pick<HookResult, 'status'> & Partial<HookResult>) => async (): Promise<HookResult> => {
    return { output: {}, error: undefined, ...result } as HookResult;
  };

describe('invokeAroundCompletion', () => {
  describe('happy path', () => {
    it('returns anonymized system/messages from workflow.output', async () => {
      const hookInvoker = async (): Promise<HookResult> => ({
        status: 'completed',
        output: {
          system: 'anon-system',
          messages: [{ role: 'user', content: 'anon message' }],
          tokenMap: {},
        },
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

    it('falls back to original system/messages when workflow.output has no fields', async () => {
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

    it('returns tokenMap from workflow.output for the caller to restore tokens', async () => {
      const token = 'IP_aabbccdd00112233445566778899aabb';
      const hookInvoker = async (): Promise<HookResult> => ({
        status: 'completed',
        output: {
          tokenMap: { [token]: { original: '192.168.1.50', entityClass: 'IP' } },
        },
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'sess-restore' } },
        system: undefined,
        messages,
      });

      expect(result.tokenMap[token]?.original).toBe('192.168.1.50');
    });

    it('injects anonymization instruction into system when tokens are produced', async () => {
      const token = 'IP_aabbccdd00112233445566778899aabb';
      const hookInvoker = async (): Promise<HookResult> => ({
        status: 'completed',
        output: {
          system: 'anon-system',
          tokenMap: { [token]: { original: '192.168.1.50', entityClass: 'IP' } },
        },
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

    it('passes sessionId, salt, and raw system/messages to the hook payload', async () => {
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
      expect(typeof capturedPayload[0].salt).toBe('string');
    });

    it('does not pass anonymizationContext as a capability', async () => {
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

      expect(capturedCapabilities[0]).not.toHaveProperty('anonymizationContext');
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
    it('returns kind: buffered when the hook result contains a result string', async () => {
      const hookInvoker = async (): Promise<import('@kbn/workflows/server/types').HookResult> => ({
        status: 'completed',
        output: {
          result: 'restored LLM response',
          tokenMap: {},
        },
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
      expect(result.finalResponse).toBe('restored LLM response');
      expect(result.sessionId).toBe('buf-1');
    });

    it('exposes tokenMap from the buffered workflow output', async () => {
      const token = 'IP_aabbccdd00112233445566778899aabb';
      const hookInvoker = async (): Promise<import('@kbn/workflows/server/types').HookResult> => ({
        status: 'completed',
        output: {
          result: 'response text',
          tokenMap: { [token]: { original: '10.0.0.1', entityClass: 'IP' } },
        },
      });

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'buf-2' } },
        system: undefined,
        messages,
      });

      expect(result.kind).toBe('buffered');
      expect(result.tokenMap[token]?.original).toBe('10.0.0.1');
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

  describe('dual-channel tokenMap wiring (call_site.proceed)', () => {
    it('proceedFn receives the tokenMap from call_site.proceed with: input', async () => {
      const capturedProceedInputs: Array<Record<string, unknown>> = [];

      const proceedFn = async (
        input: Record<string, unknown>
      ): Promise<Record<string, unknown>> => {
        capturedProceedInputs.push(input);
        return { response: 'restored response' };
      };

      const token = 'IP_aabbccdd00112233445566778899aabb';
      const tokenMapFixture = { [token]: { original: '10.0.0.1', entityClass: 'IP' } };

      const hookInvoker = async (
        _triggerId: string,
        _payload: Record<string, unknown>,
        capabilities?: Record<string, unknown>
      ): Promise<import('@kbn/workflows/server/types').HookResult> => {
        if (capabilities?.proceedFn) {
          const fn = capabilities.proceedFn as (
            input: Record<string, unknown>
          ) => Promise<Record<string, unknown>>;
          // Simulate the YAML engine rendering with: { tokenMap } from the step
          await fn({ system: 'anon-sys', messages: [], tokenMap: tokenMapFixture });
        }
        return {
          status: 'completed',
          output: { result: 'restored response', tokenMap: tokenMapFixture },
        };
      };

      const result = await invokeAroundCompletion({
        anonymizationHookInvoker: hookInvoker,
        config: makeConfig(),
        logger,
        metadata: { anonymization: { sessionId: 'tc-1' } },
        system: 'sys',
        messages,
        proceedFn,
      });

      expect(capturedProceedInputs).toHaveLength(1);
      expect(capturedProceedInputs[0].tokenMap).toEqual(tokenMapFixture);

      expect(result.kind).toBe('buffered');
      if (result.kind !== 'buffered') throw new Error('Expected buffered result');
      expect(result.finalResponse).toBe('restored response');
      expect(result.tokenMap).toEqual(tokenMapFixture);
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
