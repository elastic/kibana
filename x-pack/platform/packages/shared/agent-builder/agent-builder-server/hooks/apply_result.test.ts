/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, ConversationRoundStatus } from '@kbn/agent-builder-common';
import {
  applyBeforeConversationRoundResult,
  applyAfterConversationRoundResult,
  applyBeforeToolCallResult,
  applyAfterToolCallResult,
  applyHookResultByLifecycle,
} from './apply_result';
import type {
  BeforeConversationRoundHookContext,
  AfterConversationRoundHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
} from './types';

const createMockRequest = () => ({ headers: {} } as BeforeConversationRoundHookContext['request']);

describe('apply_result', () => {
  describe('applyBeforeConversationRoundResult', () => {
    const baseContext: BeforeConversationRoundHookContext = {
      request: createMockRequest(),
      agentId: 'agent-1',
      conversation: { id: 'conv-1', rounds: [] },
      nextInput: { message: 'original' },
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyBeforeConversationRoundResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result is null', () => {
      expect(applyBeforeConversationRoundResult(baseContext, null)).toBe(baseContext);
    });

    it('returns context unchanged when result is a non-object', () => {
      expect(applyBeforeConversationRoundResult(baseContext, 'string')).toBe(baseContext);
      expect(applyBeforeConversationRoundResult(baseContext, 42)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no nextInput', () => {
      expect(applyBeforeConversationRoundResult(baseContext, {})).toBe(baseContext);
      expect(applyBeforeConversationRoundResult(baseContext, { round: {} })).toBe(baseContext);
    });

    it('returns new context with nextInput when result has nextInput', () => {
      const newInput = { message: 'overridden' };
      const result = applyBeforeConversationRoundResult(baseContext, { nextInput: newInput });
      expect(result).not.toBe(baseContext);
      expect(result.nextInput).toEqual(newInput);
      expect(result.agentId).toBe(baseContext.agentId);
    });
  });

  describe('applyAfterConversationRoundResult', () => {
    const baseContext: AfterConversationRoundHookContext = {
      request: createMockRequest(),
      agentId: 'agent-1',
      conversation: { id: 'conv-1', rounds: [] },
      round: {
        id: 'round-1',
        status: ConversationRoundStatus.inProgress,
        input: { message: 'hi' },
        steps: [],
      },
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyAfterConversationRoundResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result is null', () => {
      expect(applyAfterConversationRoundResult(baseContext, null)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no round', () => {
      expect(applyAfterConversationRoundResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with round when result has round', () => {
      const newRound = {
        id: 'round-2',
        status: ConversationRoundStatus.completed,
        input: { message: 'hi' },
        steps: [],
      };
      const result = applyAfterConversationRoundResult(baseContext, { round: newRound });
      expect(result).not.toBe(baseContext);
      expect(result.round).toEqual(newRound);
      expect(result.agentId).toBe(baseContext.agentId);
    });
  });

  describe('applyBeforeToolCallResult', () => {
    const baseContext: BeforeToolCallHookContext = {
      request: createMockRequest(),
      toolId: 'tool-1',
      toolCallId: 'call-1',
      toolParams: { a: 1 },
      source: 'agent',
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyBeforeToolCallResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result is null', () => {
      expect(applyBeforeToolCallResult(baseContext, null)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no toolParams', () => {
      expect(applyBeforeToolCallResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with toolParams when result has toolParams', () => {
      const newParams = { b: 2, c: 3 };
      const result = applyBeforeToolCallResult(baseContext, { toolParams: newParams });
      expect(result).not.toBe(baseContext);
      expect(result.toolParams).toEqual(newParams);
      expect(result.toolId).toBe(baseContext.toolId);
    });
  });

  describe('applyAfterToolCallResult', () => {
    const baseContext: AfterToolCallHookContext = {
      request: createMockRequest(),
      toolId: 'tool-1',
      toolCallId: 'call-1',
      toolParams: {},
      source: 'agent',
      toolReturn: { results: [] },
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyAfterToolCallResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result is null', () => {
      expect(applyAfterToolCallResult(baseContext, null)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no toolReturn', () => {
      expect(applyAfterToolCallResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with toolReturn when result has toolReturn', () => {
      const newReturn = { results: [{ content: 'ok' }] };
      const result = applyAfterToolCallResult(baseContext, { toolReturn: newReturn });
      expect(result).not.toBe(baseContext);
      expect(result.toolReturn).toEqual(newReturn);
      expect(result.toolId).toBe(baseContext.toolId);
    });
  });

  describe('applyHookResultByLifecycle', () => {
    it('delegates beforeConversationRound to applyBeforeConversationRoundResult', () => {
      const context: BeforeConversationRoundHookContext = {
        request: createMockRequest(),
        agentId: 'a',
        conversation: { id: 'c', rounds: [] },
        nextInput: { message: 'x' },
      };
      const nextInput = { message: 'y' };
      const fn = applyHookResultByLifecycle[HookLifecycle.beforeConversationRound];
      const result = fn(context, { nextInput });
      expect(result.nextInput).toEqual(nextInput);
    });

    it('delegates afterConversationRound to applyAfterConversationRoundResult', () => {
      const context: AfterConversationRoundHookContext = {
        request: createMockRequest(),
        agentId: 'a',
        conversation: { id: 'c', rounds: [] },
        round: {
          id: 'r1',
          status: ConversationRoundStatus.inProgress,
          input: { message: 'x' },
          steps: [],
        },
      };
      const round = {
        id: 'r2',
        status: ConversationRoundStatus.completed,
        input: { message: 'x' },
        steps: [],
      };
      const fn = applyHookResultByLifecycle[HookLifecycle.afterConversationRound];
      const result = fn(context, { round });
      expect(result.round).toEqual(round);
    });

    it('delegates beforeToolCall to applyBeforeToolCallResult', () => {
      const context: BeforeToolCallHookContext = {
        request: createMockRequest(),
        toolId: 't',
        toolCallId: 'c',
        toolParams: {},
        source: 'agent',
      };
      const toolParams = { x: 1 };
      const fn = applyHookResultByLifecycle[HookLifecycle.beforeToolCall];
      const result = fn(context, { toolParams });
      expect(result.toolParams).toEqual(toolParams);
    });

    it('delegates afterToolCall to applyAfterToolCallResult', () => {
      const context: AfterToolCallHookContext = {
        request: createMockRequest(),
        toolId: 't',
        toolCallId: 'c',
        toolParams: {},
        source: 'agent',
        toolReturn: { results: [] },
      };
      const toolReturn = { results: [{ content: 'done' }] };
      const fn = applyHookResultByLifecycle[HookLifecycle.afterToolCall];
      const result = fn(context, { toolReturn });
      expect(result.toolReturn).toEqual(toolReturn);
    });
  });
});
