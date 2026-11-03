/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { BrowserToolCallEvent, ChatEvent } from '@kbn/agent-builder-common';
import { ChatEventType, EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { ConversationActions } from '../conversation/use_conversation_actions';
import type { BrowserToolDispatcher } from '../../../services/browser_tools';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';

const buildActionsMock = (): jest.Mocked<ConversationActions> =>
  ({
    invalidateConversation: jest.fn(),
    onExecutionStarted: jest.fn(),
    onExecutionTerminated: jest.fn(),
    deleteConversation: jest.fn(),
    renameConversation: jest.fn(),
  } as unknown as jest.Mocked<ConversationActions>);

const run = async (events: ChatEvent[]) => {
  const events$ = new Subject<ChatEvent>();
  const conversationActions = buildActionsMock();
  const done = subscribeToChatEvents({
    events$,
    conversationActions,
    executionId: 'exec-1',
    agentId: 'agent-1',
    streamSignal: new AbortController().signal,
    isAborted: () => false,
  });
  events.forEach((event) => events$.next(event));
  events$.complete();
  await done;
  return conversationActions;
};

const agent = { type: EventActorType.agent, id: 'agent' };

describe('subscribeToChatEvents', () => {
  it('calls onExecutionStarted for execution_started', async () => {
    const actions = await run([
      {
        type: TimelineEventType.executionStarted,
        id: 'r1::execution_started',
        created_at: '2026-01-01T00:00:00.000Z',
        actor: agent,
        execution_id: 'r1::execution',
        data: { trigger_type: 'user_message' },
      } as ChatEvent,
    ]);

    expect(actions.onExecutionStarted).toHaveBeenCalledTimes(1);
    expect(actions.onExecutionTerminated).not.toHaveBeenCalled();
  });

  it('calls onExecutionTerminated for execution_terminated', async () => {
    const actions = await run([
      {
        type: TimelineEventType.executionTerminated,
        id: 'r1::execution_terminated',
        created_at: '2026-01-01T00:00:01.000Z',
        actor: agent,
        execution_id: 'r1::execution',
        data: {
          model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
          time_to_first_token: 1,
          time_to_last_token: 2,
          outcome: { type: 'responded', response: { message: 'done' } },
        },
      } as ChatEvent,
    ]);

    expect(actions.onExecutionTerminated).toHaveBeenCalledTimes(1);
    expect(actions.onExecutionStarted).not.toHaveBeenCalled();
  });

  it('does not touch the cache for content events', async () => {
    const actions = await run([
      {
        type: ChatEventType.messageChunk,
        data: { message_id: 'm', text_chunk: 'hi' },
      } as ChatEvent,
      {
        type: ChatEventType.toolCall,
        data: { tool_call_id: 't', tool_id: 'x', params: {} },
      } as ChatEvent,
      { type: ChatEventType.reasoning, data: { reasoning: 'hmm' } } as ChatEvent,
      {
        type: ChatEventType.conversationCreated,
        data: {
          conversation_id: 'c',
          title: 'T',
          access_control: {},
          user: { id: 'u', username: 'u' },
        },
      } as ChatEvent,
    ]);

    Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
  });

  it('rejects on a stream error and resolves when aborted', async () => {
    const failing$ = new Subject<ChatEvent>();
    const failing = subscribeToChatEvents({
      events$: failing$,
      conversationActions: buildActionsMock(),
      executionId: 'exec-1',
      agentId: 'agent-1',
      streamSignal: new AbortController().signal,
      isAborted: () => false,
    });
    failing$.error(new Error('boom'));
    await expect(failing).rejects.toThrow('boom');

    const aborted$ = new Subject<ChatEvent>();
    const aborted = subscribeToChatEvents({
      events$: aborted$,
      conversationActions: buildActionsMock(),
      executionId: 'exec-1',
      agentId: 'agent-1',
      streamSignal: new AbortController().signal,
      isAborted: () => true,
    });
    aborted$.error(new Error('aborted'));
    await expect(aborted).resolves.toBeUndefined();
  });

  describe('browser tool calls', () => {
    const browserToolCall = {
      type: ChatEventType.browserToolCall,
      data: {
        tool_call_id: 'call-1',
        tool_id: 'my_tool',
        params: { a: 1 },
        client_id: 'client-1',
        expires_at: '2026-01-01T00:01:00.000Z',
      },
    } as BrowserToolCallEvent;

    const subscribeWith = async (options: {
      dispatcher?: BrowserToolDispatcher;
      clientId?: string;
    }) => {
      const events$ = new Subject<ChatEvent>();
      const streamSignal = new AbortController().signal;
      const legacyTools = [{ id: 'legacy' }] as unknown as Parameters<
        typeof subscribeToChatEvents
      >[0]['legacyTools'];
      const done = subscribeToChatEvents({
        events$,
        conversationActions: buildActionsMock(),
        executionId: 'exec-1',
        agentId: 'agent-1',
        conversationId: 'conv-1',
        legacyTools,
        streamSignal,
        isAborted: () => false,
        ...options,
      });
      events$.next(browserToolCall);
      events$.complete();
      await done;
      return { streamSignal, legacyTools };
    };

    it('forwards browser_tool_call events to the dispatcher with the stream context', async () => {
      const dispatch = jest.fn();
      const dispatcher = { dispatch } as unknown as BrowserToolDispatcher;

      const { streamSignal, legacyTools } = await subscribeWith({
        dispatcher,
        clientId: 'client-1',
      });

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(browserToolCall, {
        clientId: 'client-1',
        executionId: 'exec-1',
        conversationId: 'conv-1',
        agentId: 'agent-1',
        legacyTools,
        streamSignal,
      });
    });

    it('does not dispatch without a client id', async () => {
      const dispatch = jest.fn();
      await subscribeWith({ dispatcher: { dispatch } as unknown as BrowserToolDispatcher });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
