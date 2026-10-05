/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType, type MessageCompleteEvent } from '@kbn/agent-builder-common';
import {
  applyBeforeAgentResult,
  applyBeforeToolCallResult,
  applyAfterToolCallResult,
  applyAfterChatEventResult,
} from './apply_result';
import type {
  BeforeAgentHookContext,
  BeforeToolCallHookContext,
  AfterToolCallHookContext,
  AfterChatEventHookContext,
} from './types';
import type { RunToolReturn } from '../runner/runner';
import type { ToolHandlerContext } from '../tools/handler';

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

    it('returns new context with pre-execution workflow data when provided', () => {
      const preExecutionWorkflow = {
        model_context: 'model context',
        workflow_context: {
          'nightshift.semantic_memory.recall': { version: 1, data: { recalled_ids: ['memory-1'] } },
        },
      };
      const result = applyBeforeAgentResult(baseContext, { preExecutionWorkflow });

      expect(result).not.toBe(baseContext);
      expect(result.preExecutionWorkflow).toEqual(preExecutionWorkflow);
      expect(result.nextInput).toBe(baseContext.nextInput);
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
      toolHandlerContext: {} as ToolHandlerContext,
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

  describe('applyAfterChatEventResult', () => {
    const event: MessageCompleteEvent = {
      type: ChatEventType.messageComplete,
      data: { message_id: 'message-1', message_content: 'original' },
    };
    const baseContext: AfterChatEventHookContext = {
      request: createMockRequest(),
      conversationId: 'conversation-1',
      executionId: 'execution-1',
      event,
    };

    it('returns context unchanged when result is undefined', () => {
      expect(applyAfterChatEventResult(baseContext, undefined)).toBe(baseContext);
    });

    it('returns context unchanged when result object has no event', () => {
      expect(applyAfterChatEventResult(baseContext, {})).toBe(baseContext);
    });

    it('returns new context with event when result has event', () => {
      const newEvent: MessageCompleteEvent = {
        ...event,
        data: { ...event.data, message_content: 'overridden' },
      };
      const result = applyAfterChatEventResult(baseContext, { event: newEvent });
      expect(result).not.toBe(baseContext);
      expect(result.event).toBe(newEvent);
      expect(result.executionId).toBe(baseContext.executionId);
    });
  });
});
