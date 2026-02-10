/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import {
  applyBeforeAgentResult,
  applyAfterAgentResult,
  applyBeforeToolCallResult,
  applyAfterToolCallResult,
} from './apply_result';
import type {
  BeforeAgentHookContext,
  AfterAgentHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
} from './types';
import type { RunToolReturn } from '../runner/runner';

const createMockRequest = () => ({ headers: {} } as BeforeAgentHookContext['request']);

describe('apply_result', () => {
  describe('applyBeforeAgentResult', () => {
    const baseContext: BeforeAgentHookContext = {
      request: createMockRequest(),
      nextInput: { message: 'original', attachments: [] },
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyBeforeAgentResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no nextInput', () => {
      expect(applyBeforeAgentResult(baseContext, {})).toBe(baseContext);
      expect(applyBeforeAgentResult(baseContext, { nextInput: undefined })).toBe(baseContext);
    });

    it('returns new context with nextInput when result has nextInput', () => {
      const newInput = { message: 'overridden', attachments: [] };
      const result = applyBeforeAgentResult(baseContext, { nextInput: newInput });
      expect(result).not.toBe(baseContext);
      expect(result.nextInput).toEqual(newInput);
    });
  });

  describe('applyAfterAgentResult', () => {
    const baseContext: AfterAgentHookContext = {
      request: createMockRequest(),
      conversation: { id: 'conv-1', rounds: [] } as unknown as Conversation,
      round: {
        id: 'round-1',
        status: ConversationRoundStatus.inProgress,
        input: { message: 'hi' },
        steps: [],
      } as unknown as ConversationRound,
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyAfterAgentResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no round', () => {
      expect(applyAfterAgentResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with round when result has round', () => {
      const newRound = {
        id: 'round-2',
        status: ConversationRoundStatus.completed,
        input: { message: 'hi' },
        steps: [],
      } as unknown as ConversationRound;
      const result = applyAfterAgentResult(baseContext, { round: newRound });
      expect(result).not.toBe(baseContext);
      expect(result.round).toEqual(newRound);
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
