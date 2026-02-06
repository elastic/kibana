/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import {
  applyBeforeConversationRoundResult,
  applyAfterConversationRoundResult,
  applyBeforeToolCallResult,
  applyAfterToolCallResult,
} from './apply_result';
import type {
  BeforeConversationRoundHookContext,
  AfterConversationRoundHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
} from './types';
import type { RunToolReturn } from '../runner/runner';

const createMockRequest = () => ({ headers: {} } as BeforeConversationRoundHookContext['request']);

describe('apply_result', () => {
  describe('applyBeforeConversationRoundResult', () => {
    const baseContext: BeforeConversationRoundHookContext = {
      request: createMockRequest(),
      agentId: 'agent-1',
      conversation: { id: 'conv-1', rounds: [] } as unknown as Conversation,
      nextInput: { message: 'original' },
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyBeforeConversationRoundResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no nextInput', () => {
      expect(applyBeforeConversationRoundResult(baseContext, {})).toBe(baseContext);
      expect(applyBeforeConversationRoundResult(baseContext, { nextInput: undefined })).toBe(
        baseContext
      );
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
      conversation: { id: 'conv-1', rounds: [] } as unknown as Conversation,
      round: {
        id: 'round-1',
        status: ConversationRoundStatus.inProgress,
        input: { message: 'hi' },
        steps: [],
      } as unknown as ConversationRound,
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyAfterConversationRoundResult(baseContext, undefined)).toBe(baseContext);
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
      } as unknown as ConversationRound;
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

    it('returns context unchanged when result object has no toolReturn', () => {
      expect(applyAfterToolCallResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with toolReturn when result has toolReturn', () => {
      const newReturn = { results: [{ content: 'ok' }] } as unknown as RunToolReturn;
      const result = applyAfterToolCallResult(baseContext, { toolReturn: newReturn });
      expect(result).not.toBe(baseContext);
      expect(result.toolReturn).toEqual(newReturn);
      expect(result.toolId).toBe(baseContext.toolId);
    });
  });
});
