/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  TimelineEventType,
  ToolResultType,
  NON_INTERACTIVE_DECLINED_REASON,
  type ChatEvent,
  type ExecutionOutcome,
  type ToolResult,
} from '@kbn/agent-builder-common';
import { buildChatMessageResponseFromEvents } from './chat_message_response';

const conversationCreated = {
  type: ChatEventType.conversationCreated,
  data: {
    conversation_id: 'conv-1',
    title: 'A title',
    access_control: { access_mode: 'private', entries: [] },
  },
} as unknown as ChatEvent;

const executionTerminated = (outcome: ExecutionOutcome) =>
  ({
    id: 'exec-1::execution_terminated',
    type: TimelineEventType.executionTerminated,
    created_at: '2024-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent-1' },
    execution_id: 'exec-1',
    trigger_event_id: 'exec-1::user_message',
    data: {
      model_usage: { total_tokens: 0 },
      time_to_first_token: 1,
      time_to_last_token: 2,
      outcome,
    },
  } as unknown as ChatEvent);

const toolResult = (toolId: string, results: ToolResult[]) =>
  ({
    type: ChatEventType.toolResult,
    data: { tool_call_id: `call-${toolId}`, tool_id: toolId, results },
  } as unknown as ChatEvent);

const declined = (message: string, metadata: Record<string, unknown> = {}): ToolResult => ({
  tool_result_id: 'abc123',
  type: ToolResultType.error,
  data: { message, metadata: { ...metadata, declined_reason: NON_INTERACTIVE_DECLINED_REASON } },
});

const plainError: ToolResult = {
  tool_result_id: 'def456',
  type: ToolResultType.error,
  data: { message: 'index not found' },
};

const otherResult: ToolResult = {
  tool_result_id: 'ghi789',
  type: ToolResultType.other,
  data: { rows: 3 },
};

describe('buildChatMessageResponseFromEvents', () => {
  it('reads the answer from the execution_terminated outcome and the conversation id from the lifecycle event', () => {
    const response = buildChatMessageResponseFromEvents([
      conversationCreated,
      executionTerminated({ type: 'responded', response: { message: 'Hello there' } }),
    ]);

    expect(response).toStrictEqual({
      conversation_id: 'conv-1',
      answer: 'Hello there',
    });
  });

  it('omits declined_prompts when only non-declined tool results were emitted', () => {
    const response = buildChatMessageResponseFromEvents([
      toolResult('search', [plainError, otherResult]),
      conversationCreated,
      executionTerminated({ type: 'responded', response: { message: 'Found it' } }),
    ]);

    expect(response).not.toHaveProperty('declined_prompts');
  });

  it('keeps an empty answer when the agent finished without a message', () => {
    const response = buildChatMessageResponseFromEvents([
      conversationCreated,
      executionTerminated({ type: 'responded', response: { message: '' } }),
    ]);

    expect(response.answer).toBe('');
  });

  it('lists only the tagged auto-declined results, in call order, ignoring other tool results', () => {
    const response = buildChatMessageResponseFromEvents([
      toolResult('first-tool', [declined('declined first')]),
      toolResult('search', [plainError, otherResult]),
      toolResult('destructive-api', [
        declined('destructive call declined', { target: 'kibana', api: 'delete-index' }),
      ]),
      conversationCreated,
      executionTerminated({ type: 'responded', response: { message: 'Could not do it' } }),
    ]);

    expect(response.declined_prompts).toEqual([
      { tool_id: 'first-tool', message: 'declined first' },
      { tool_id: 'destructive-api', message: 'destructive call declined' },
    ]);
  });

  it('fails when the run paused on a prompt instead of declining it', () => {
    expect(() =>
      buildChatMessageResponseFromEvents([
        conversationCreated,
        executionTerminated({
          type: 'prompt_requested',
          prompts: [{ id: 'p1', type: 'confirmation', data: {} }] as never,
        }),
      ])
    ).toThrow(/asked for user input/);
  });

  it('fails when the run emitted no execution_terminated event', () => {
    expect(() => buildChatMessageResponseFromEvents([conversationCreated])).toThrow(
      /No execution_terminated event/
    );
  });

  it('fails when the run emitted no conversation event', () => {
    expect(() =>
      buildChatMessageResponseFromEvents([
        executionTerminated({ type: 'responded', response: { message: 'orphan' } }),
      ])
    ).toThrow(/No conversation event/);
  });
});
