/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  AttachmentTimelineEvent,
  ChatEvent,
  Conversation,
  ConversationRoundAuthor,
  ConversationRoundStep,
  RoundCompleteEvent,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  AgentBuilderErrorCode,
  ChatEventType,
  CONVERSATION_SCHEMA_VERSION,
  ConversationAccessControlMode,
  ConversationOriginType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
  createRequestAbortedError,
  isAttachmentEvent,
  roundUserMessageEventId,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import type { ConversationWithOperation } from './conversations';
import {
  appendResumeExecution$,
  appendRoundTerminated$,
  getConversation,
  persistExecutionInterruption,
  persistUserMessage,
} from './conversations';
import { userMessageEvent } from '../../conversation/client/rounds_to_events';

jest.mock('../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

const attachmentAddedEvent = (id = 'att-evt-1'): AttachmentTimelineEvent => ({
  id,
  type: TimelineEventType.attachmentAdded,
  created_at: '2024-01-01T00:00:10.000Z',
  actor: { type: 'user', id: 'u1' } as never,
  execution_id: 'round-1::execution',
  data: {
    attachment_id: 'att-1',
    attachment_type: 'text',
    current_version: 1,
    render_inline: false,
    source: 'chat_input',
  },
});

describe('conversations utils', () => {
  describe('getConversation', () => {
    describe('operation determination', () => {
      it('returns CREATE operation when no conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
        });

        expect(result.operation).toBe('CREATE');
      });

      it('returns UPDATE operation when no conversationId is provided and origin matches an existing conversation', async () => {
        const conversationClient = createConversationClientMock();
        const origin = {
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        };
        const existingConversation = createEmptyConversation({
          id: 'existing-conversation',
          origin,
        });
        conversationClient.getByOrigin.mockResolvedValue(existingConversation);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
          origin,
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.id).toBe('existing-conversation');
        expect(conversationClient.getByOrigin).toHaveBeenCalledWith(origin);
      });

      it('defaults access control to private for new conversation placeholders', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
        });

        expect(result.access_control).toEqual({
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        });
      });

      it('uses explicit access control for new conversation placeholders', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
          accessControl: {
            access_mode: ConversationAccessControlMode.Public,
          },
        });

        expect(result.access_control).toEqual({
          access_mode: ConversationAccessControlMode.Public,
          entries: [],
        });
      });

      it('defaults read_only to false for new conversation placeholders', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
        });

        expect(result.read_only).toBe(false);
      });

      it('uses explicit read_only for new conversation placeholders', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
          readOnly: true,
        });

        expect(result.read_only).toBe(true);
      });

      it('ignores read_only when auto-created conversation already exists', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.exists.mockResolvedValue(true);
        conversationClient.get.mockResolvedValue(createEmptyConversation({ read_only: false }));

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'existing-conversation',
          autoCreateConversationWithId: true,
          conversationClient,
          readOnly: true,
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.read_only).toBe(false);
      });

      it('returns UPDATE operation when conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(createEmptyConversation());

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          conversationClient,
        });

        expect(result.operation).toBe('UPDATE');
        expect(conversationClient.get).toHaveBeenCalledWith('test-conversation');
      });

      it('returns CREATE operation when autoCreateConversationWithId=true and conversation does not exist', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.exists.mockResolvedValue(false);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'new-conversation',
          autoCreateConversationWithId: true,
          conversationClient,
        });

        expect(result.operation).toBe('CREATE');
        expect(result.id).toBe('new-conversation');
      });

      it('returns UPDATE operation when autoCreateConversationWithId=true and conversation exists', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.exists.mockResolvedValue(true);
        conversationClient.get.mockResolvedValue(createEmptyConversation());

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'existing-conversation',
          autoCreateConversationWithId: true,
          conversationClient,
        });

        expect(result.operation).toBe('UPDATE');
      });

      it('throws not found instead of creating when autoCreateConversationWithId=true and the conversation exists but is not accessible', async () => {
        // e.g. another user's private conversation with the same id: exists() reports
        // physical existence, and the converse-gated get() denies access
        const conversationClient = createConversationClientMock();
        conversationClient.exists.mockResolvedValue(true);
        conversationClient.get.mockRejectedValue(
          createConversationNotFoundError({ conversationId: 'existing-conversation' })
        );

        await expect(
          getConversation({
            agentId: 'test-agent',
            conversationId: 'existing-conversation',
            autoCreateConversationWithId: true,
            conversationClient,
          })
        ).rejects.toMatchObject({
          message: 'Conversation existing-conversation not found',
        });

        expect(conversationClient.create).not.toHaveBeenCalled();
      });

      it('ignores access control when auto-created conversation already exists', async () => {
        const conversationClient = createConversationClientMock();
        const existingConversation = createEmptyConversation({
          access_control: {
            access_mode: ConversationAccessControlMode.Private,
            entries: [],
          },
        });
        conversationClient.exists.mockResolvedValue(true);
        conversationClient.get.mockResolvedValue(existingConversation);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'existing-conversation',
          autoCreateConversationWithId: true,
          conversationClient,
          accessControl: {
            access_mode: ConversationAccessControlMode.Public,
          },
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.access_control).toEqual({
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        });
      });
    });
  });

  describe('persistUserMessage', () => {
    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    const runReceipt = async ({
      conversation,
      conversationClient,
      eventId = 'round-1::user_message',
      receivedAt = new Date('2024-01-01T00:00:00.000Z'),
      input = { message: 'hi' },
      author,
      additionalEvents,
      attachments,
    }: {
      conversation: ConversationWithOperation;
      conversationClient: ReturnType<typeof createConversationClientMock>;
      eventId?: string;
      receivedAt?: Date;
      input?: { message?: string };
      author?: ConversationRoundAuthor;
      additionalEvents?: TimelineEvent[];
      attachments?: { snapshot: VersionedAttachment[]; produced: VersionedAttachment[] };
    }) => {
      conversationClient.appendEvents.mockResolvedValue(conversation);
      return persistUserMessage({
        conversation,
        conversationClient,
        eventId,
        receivedAt,
        input,
        author,
        additionalEvents,
        attachments,
      });
    };

    it('atomically creates the conversation doc with the user_message seeded on CREATE (single write, no separate append)', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(
        createEmptyConversation({ id: 'conv-1', agent_id: 'agent-1' }),
        'CREATE'
      );

      await runReceipt({
        conversation,
        conversationClient,
        input: { message: 'raw input' },
        author: { id: 'u1', username: 'u1' },
      });

      // Single ES write: the doc is created atomically with the user_message inside
      // it, so an abort mid-write cannot leave an empty placeholder.
      expect(conversationClient.create).toHaveBeenCalledTimes(1);
      const [createArgs] = conversationClient.create.mock.calls[0];
      expect(createArgs.id).toBe('conv-1');
      expect(createArgs.title).toBe(DEFAULT_CONVERSATION_TITLE);
      expect(createArgs.rounds).toEqual([]);
      expect(createArgs.events).toHaveLength(1);
      expect(createArgs.events![0]).toMatchObject({
        id: 'round-1::user_message',
        type: TimelineEventType.userMessage,
        data: { message: 'raw input' },
      });

      // No separate append on the happy CREATE path — the event is inside the create.
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('skips create for UPDATE but still appends the user_message', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE');

      await runReceipt({ conversation, conversationClient });

      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
    });

    it('falls back to appendEvents when CREATE races another writer (conversationAlreadyExists)', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'CREATE');
      conversationClient.create.mockRejectedValueOnce(
        createConversationAlreadyExistsError({ conversationId: 'conv-1' })
      );

      await runReceipt({ conversation, conversationClient });

      // The race loser still has to land the user_message on the winning doc.
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [appendArgs] = conversationClient.appendEvents.mock.calls[0];
      expect(appendArgs.events).toHaveLength(1);
      expect(appendArgs.events[0]).toMatchObject({
        id: 'round-1::user_message',
        type: TimelineEventType.userMessage,
      });
    });

    it('propagates unexpected create errors', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'CREATE');
      const boom = new Error('boom');
      conversationClient.create.mockRejectedValueOnce(boom);

      await expect(
        persistUserMessage({
          conversation,
          conversationClient,
          eventId: 'round-1::user_message',
          receivedAt: new Date(),
          input: { message: 'hi' },
        })
      ).rejects.toBe(boom);
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('defaults an undefined message to an empty string so the receipt-time snapshot is a valid RoundInput', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      conversationClient.appendEvents.mockResolvedValue(conversation);

      await runReceipt({ conversation, conversationClient, input: {} });

      const [appendArgs] = conversationClient.appendEvents.mock.calls[0];
      expect((appendArgs.events[0].data as { message: string }).message).toBe('');
    });
  });

  describe('appendRoundTerminated$', () => {
    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    const runEnd = async ({
      conversation,
      conversationClient,
      roundCompleteEvent,
      title$,
    }: {
      conversation: ConversationWithOperation;
      conversationClient: ReturnType<typeof createConversationClientMock>;
      roundCompleteEvent: RoundCompleteEvent;
      title$?: Observable<string>;
    }): Promise<ChatEvent[]> => {
      conversationClient.replaceRoundEvents.mockResolvedValue(conversation);
      return lastValueFrom(
        appendRoundTerminated$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of(roundCompleteEvent),
          ...(title$ ? { title$ } : {}),
        }).pipe(toArray())
      );
    };

    it('appends attachment_events after the projected round events in the same write', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE');
      const round = createRound({ id: 'round-1', status: ConversationRoundStatus.completed });
      const attachmentEvent = attachmentAddedEvent();

      await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false, attachment_events: [attachmentEvent] },
        },
      });

      const [args] = conversationClient.replaceRoundEvents.mock.calls[0];
      const ids = args.events.map((e: { id: string }) => e.id);
      expect(ids[ids.length - 1]).toBe('att-evt-1');
      expect(ids).toContain('round-1::execution_terminated');
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('replaces the round events with the full canonical projection and folds title + status into the same write for CREATE', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'CREATE');
      const round = createRound({
        id: 'round-1',
        status: ConversationRoundStatus.completed,
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_last_token: 1000,
      });

      const emitted = await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false },
        },
        title$: of('Generated title'),
      });

      expect(conversationClient.replaceRoundEvents).toHaveBeenCalledTimes(1);
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      const [args] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(args.id).toBe('conv-1');
      expect(args.roundId).toBe('round-1');
      expect(args.title).toBe('Generated title');
      expect(args.status).toBe(ConversationRoundStatus.completed);
      expect(args.events.map((event: { id: string }) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
      ]);

      expect(emitted.map((event) => event.type)).toEqual([
        TimelineEventType.executionTerminated,
        ChatEventType.conversationCreated,
      ]);
      expect((emitted[0] as { id: string }).id).toBe('round-1::execution_terminated');
    });

    it('emits execution_terminated then conversationUpdated for UPDATE', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      const round = createRound({ id: 'r', status: ConversationRoundStatus.completed });

      const emitted = await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false },
        },
      });

      expect(emitted.map((event) => event.type)).toEqual([
        TimelineEventType.executionTerminated,
        ChatEventType.conversationUpdated,
      ]);
    });

    it('forwards the exact persisted execution_terminated event for events-native docs', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      const round = createRound({
        id: 'round-1',
        status: ConversationRoundStatus.completed,
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_last_token: 1000,
      });

      // Simulate the events-native write response: the stored event carries a distinct
      // `created_at` / `actor.id` we can assert to prove we are forwarding the persisted
      // copy, not our local projection.
      const persistedTerminated = {
        id: 'round-1::execution_terminated',
        type: TimelineEventType.executionTerminated,
        created_at: '2099-12-31T23:59:59.000Z',
        actor: { type: 'agent', id: 'from-store' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: {
          outcome: { type: 'responded', response: { message: 'stored' } },
          time_to_first_token: 42,
          time_to_last_token: 4242,
          model_usage: { connector_id: 'x', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
        },
      };
      conversationClient.replaceRoundEvents.mockResolvedValue({
        ...conversation,
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events: [persistedTerminated] as never,
      });

      const emitted = await lastValueFrom(
        appendRoundTerminated$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of<RoundCompleteEvent>({
            type: ChatEventType.roundComplete,
            data: { round, resumed: false },
          }),
        }).pipe(toArray())
      );

      expect(emitted[0]).toEqual(persistedTerminated);
      expect(emitted[1].type).toBe(ChatEventType.conversationUpdated);
    });

    it('emits an execution_terminated with prompt_requested outcome when the round pauses on HITL', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      const round = createRound({
        id: 'round-p',
        status: ConversationRoundStatus.awaitingPrompt,
        pending_prompts: [
          {
            id: 'tools.my_tool.confirmation',
            type: 'confirmation',
          } as never,
        ],
      });

      const emitted = await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false },
        },
      });

      const terminated = emitted[0] as { data: { outcome: { type: string; prompts: unknown[] } } };
      expect(terminated.data.outcome.type).toBe('prompt_requested');
      expect(terminated.data.outcome.prompts).toEqual([
        { id: 'tools.my_tool.confirmation', type: 'confirmation' },
      ]);
    });

    it('emits nothing when the persist write rejects', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      const round = createRound({ id: 'r', status: ConversationRoundStatus.completed });
      conversationClient.replaceRoundEvents.mockRejectedValue(new Error('write failed'));

      const emitted: ChatEvent[] = [];
      let terminalError: Error | undefined;
      await new Promise<void>((resolve) => {
        appendRoundTerminated$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of<RoundCompleteEvent>({
            type: ChatEventType.roundComplete,
            data: { round, resumed: false },
          }),
        }).subscribe({
          next: (event) => emitted.push(event),
          error: (error) => {
            terminalError = error as Error;
            resolve();
          },
        });
      });

      expect(emitted).toEqual([]);
      expect(terminalError?.message).toBe('write failed');
    });

    it('omits title when no title$ is provided', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      const round = createRound({ id: 'r', status: ConversationRoundStatus.completed });

      await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false },
        },
      });

      const [args] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(args).not.toHaveProperty('title');
    });

    it('reconciles attachments against the stored snapshot when the round produced attachments', async () => {
      const conversationClient = createConversationClientMock();
      const existingAttachment = { id: 'a', version: 1 } as any;
      const producedAttachment = { id: 'b', version: 1 } as any;
      const conversation = withOperation(
        createEmptyConversation({ id: 'c', attachments: [existingAttachment] }),
        'UPDATE'
      );
      const round = createRound({ id: 'r', status: ConversationRoundStatus.completed });

      await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: {
            round,
            resumed: false,
            attachments: [producedAttachment],
          },
        },
      });

      const [args] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(args.attachments).toEqual({
        snapshot: [existingAttachment],
        produced: [producedAttachment],
      });
    });

    it('appends the full projected round events (user_message + execution_started + steps + terminated) at round-end', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-steps' }), 'UPDATE');
      const steps: ConversationRoundStep[] = [
        { type: ConversationRoundStepType.reasoning, reasoning: 'r' } as ConversationRoundStep,
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 't1',
          tool_id: 'platform.core.search',
          params: {},
          results: [],
        } as ConversationRoundStep,
      ];
      const round = createRound({
        id: 'round-x',
        status: ConversationRoundStatus.completed,
        steps,
      });

      await runEnd({
        conversation,
        conversationClient,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round, resumed: false },
        },
      });

      const [args] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(args.roundId).toBe('round-x');
      expect(args.events.map((event: { type: string; id: string }) => event.type)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
        TimelineEventType.executionStep,
        TimelineEventType.executionStep,
        TimelineEventType.executionTerminated,
      ]);
      expect(args.events.map((event: { id: string }) => event.id)).toEqual([
        'round-x::user_message',
        'round-x::execution_started',
        'round-x::step::0',
        'round-x::step::1',
        'round-x::execution_terminated',
      ]);
    });
  });

  describe('appendResumeExecution$ (append-only resume write)', () => {
    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    // A stored, paused conversation: exec_0 exists (execution_id `round-1::execution`).
    const pausedConversation = (): ConversationWithOperation => ({
      ...withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE'),
      events: [
        {
          id: 'round-1::execution_terminated',
          type: TimelineEventType.executionTerminated,
          created_at: '2024-01-01T00:00:00.000Z',
          actor: { type: 'agent', id: 'agent-1' } as never,
          execution_id: 'round-1::execution',
          trigger_event_id: 'round-1::user_message',
          data: {
            model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
            time_to_first_token: 1,
            time_to_last_token: 1,
            outcome: { type: 'prompt_requested', prompts: [] },
          },
        },
      ] as never,
    });

    const followUpRound = () => ({
      ...createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
      started_at: '2024-01-01T00:05:00.000Z',
      time_to_last_token: 500,
      steps: [
        { type: ConversationRoundStepType.reasoning, reasoning: 'done' } as ConversationRoundStep,
      ],
      response: { message: 'ok' },
      input: { message: 'resume msg', attachment_refs: [{ attachment_id: 'att-2', version: 1 }] },
    });

    const run = (
      conversation: ConversationWithOperation,
      conversationClient: ReturnType<typeof createConversationClientMock>,
      roundCompleteEvent: RoundCompleteEvent
    ) =>
      lastValueFrom(
        appendResumeExecution$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of(roundCompleteEvent),
          input: { prompts: { 'tools.my_tool.confirmation': { allow: true } } },
        }).pipe(toArray())
      );

    it('appends attachment_events re-stamped with the resume execution id', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = pausedConversation();
      conversationClient.appendEvents.mockResolvedValue(conversation);
      const attachmentEvent = attachmentAddedEvent();

      await run(conversation, conversationClient, {
        type: ChatEventType.roundComplete,
        data: {
          round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
          resumed: true,
          resume_execution: { follow_up_round: followUpRound() },
          attachment_events: [attachmentEvent],
        },
      });

      const [args] = conversationClient.appendEvents.mock.calls[0];
      const last = args.events[args.events.length - 1];
      expect(last).toEqual({ ...attachmentEvent, execution_id: 'round-1::execution::1' });
    });

    it('resumes a legacy (non events-native) paused conversation through the same append-only path', async () => {
      // Regenerate was removed and legacy resumes no longer take a rounds-path write. `fromEs`
      // derives `events` from rounds for a legacy doc, which is all `nextResumeIndex` needs; the
      // append then writes the full projection and `updateConversation` promotes the document.
      const conversationClient = createConversationClientMock();
      const legacy: ConversationWithOperation = {
        ...pausedConversation(),
        schema_version: undefined,
      };
      conversationClient.appendEvents.mockResolvedValue(legacy);

      await run(legacy, conversationClient, {
        type: ChatEventType.roundComplete,
        data: {
          round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
          resumed: true,
          resume_execution: { follow_up_round: followUpRound() },
        },
      });

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [args] = conversationClient.appendEvents.mock.calls[0];
      const ids = args.events.map((event: { id: string }) => event.id);
      // exec_0 (derived) counts, so the resume is exec_1 — same as an events-native doc.
      expect(ids).toContain('round-1::prompt_response::1');
      expect(ids).toContain('round-1::execution::1::execution_terminated');
    });

    it('appends a prompt_response + a new exec_1 without touching exec_0', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = pausedConversation();
      conversationClient.appendEvents.mockResolvedValue(conversation);
      const follow = followUpRound();

      const emitted = await run(conversation, conversationClient, {
        type: ChatEventType.roundComplete,
        data: {
          round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
          resumed: true,
          resume_execution: { follow_up_round: follow },
        },
      });

      expect(conversationClient.replaceRoundEvents).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.events.map((e: { id: string }) => e.id)).toEqual([
        'round-1::prompt_response::1',
        'round-1::execution::1::execution_started',
        'round-1::execution::1::step::0',
        'round-1::execution::1::execution_terminated',
      ]);
      expect(args.status).toBe(ConversationRoundStatus.completed);

      const promptResponse = args.events[0];
      expect(promptResponse.type).toBe(TimelineEventType.promptResponse);
      expect(promptResponse.data).toMatchObject({
        prompt_requested_event_id: 'round-1::execution_terminated',
        responses: { 'tools.my_tool.confirmation': { allow: true } },
        input: { message: 'resume msg', attachment_refs: [{ attachment_id: 'att-2', version: 1 }] },
      });
      expect(emitted.map((event) => event.type)).toEqual([
        TimelineEventType.executionTerminated,
        ChatEventType.conversationUpdated,
      ]);
      const terminated = emitted[0] as {
        id: string;
        execution_id: string;
        trigger_event_id: string;
      };
      expect(terminated.id).toBe('round-1::execution::1::execution_terminated');
      expect(terminated.execution_id).toBe('round-1::execution::1');
      expect(terminated.trigger_event_id).toBe('round-1::prompt_response::1');
    });

    it('derives exec_2 (index 2) for a re-pause chain', async () => {
      const conversationClient = createConversationClientMock();
      // exec_0 + exec_1 already stored -> the next resume is exec_2, answering exec_1's terminated
      const conversation: ConversationWithOperation = {
        ...pausedConversation(),
        events: [
          ...(pausedConversation().events ?? []),
          {
            id: 'round-1::execution::1::execution_terminated',
            type: TimelineEventType.executionTerminated,
            created_at: '2024-01-01T00:05:00.000Z',
            actor: { type: 'agent', id: 'agent-1' } as never,
            execution_id: 'round-1::execution::1',
            trigger_event_id: 'round-1::prompt_response::1',
            data: {
              model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
              time_to_first_token: 1,
              time_to_last_token: 1,
              outcome: { type: 'prompt_requested', prompts: [] },
            },
          },
        ] as never,
      };
      conversationClient.appendEvents.mockResolvedValue(conversation);

      const emitted = await run(conversation, conversationClient, {
        type: ChatEventType.roundComplete,
        data: {
          round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
          resumed: true,
          resume_execution: { follow_up_round: followUpRound() },
        },
      });

      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.events[0].id).toBe('round-1::prompt_response::2');
      expect(args.events[0].data).toMatchObject({
        prompt_requested_event_id: 'round-1::execution::1::execution_terminated',
      });
      expect(args.events[1].id).toBe('round-1::execution::2::execution_started');

      const terminated = emitted[0] as {
        id: string;
        execution_id: string;
        trigger_event_id: string;
      };
      expect(terminated.id).toBe('round-1::execution::2::execution_terminated');
      expect(terminated.execution_id).toBe('round-1::execution::2');
      expect(terminated.trigger_event_id).toBe('round-1::prompt_response::2');
    });

    it('links the prompt_response to the last terminated execution, skipping an interrupted resume', async () => {
      const conversationClient = createConversationClientMock();
      // exec_0 paused, exec_1 aborted -> the retry is exec_2 and answers exec_0's pause
      const conversation: ConversationWithOperation = {
        ...pausedConversation(),
        events: [
          ...(pausedConversation().events ?? []),
          {
            id: 'round-1::execution::1::execution_aborted',
            type: TimelineEventType.executionAborted,
            created_at: '2024-01-01T00:05:00.000Z',
            actor: { type: 'agent', id: 'agent-1' } as never,
            execution_id: 'round-1::execution::1',
            trigger_event_id: 'round-1::prompt_response::1',
            data: { time_to_last_token: 1 },
          },
        ] as never,
      };
      conversationClient.appendEvents.mockResolvedValue(conversation);

      await run(conversation, conversationClient, {
        type: ChatEventType.roundComplete,
        data: {
          round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
          resumed: true,
          resume_execution: { follow_up_round: followUpRound() },
        },
      });

      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.events[0].id).toBe('round-1::prompt_response::2');
      expect(args.events[0].data).toMatchObject({
        prompt_requested_event_id: 'round-1::execution_terminated',
      });
      expect(args.events[1].id).toBe('round-1::execution::2::execution_started');
      expect(args.events[1].execution_id).toBe('round-1::execution::2');
    });

    it('throws when the round_complete carries no resume_execution payload', async () => {
      const conversationClient = createConversationClientMock();
      await expect(
        run(pausedConversation(), conversationClient, {
          type: ChatEventType.roundComplete,
          data: {
            round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
            resumed: true,
          },
        })
      ).rejects.toThrow(/requires a resume_execution payload/);
    });

    it('throws when no prior execution is stored for the round', async () => {
      const conversationClient = createConversationClientMock();
      const conversation: ConversationWithOperation = {
        ...withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE'),
        events: [],
      };
      await expect(
        run(conversation, conversationClient, {
          type: ChatEventType.roundComplete,
          data: {
            round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
            resumed: true,
            resume_execution: { follow_up_round: followUpRound() },
          },
        })
      ).rejects.toThrow(/no prior execution stored/);
    });

    it('persists a resolved title alongside the resume append when title$ is provided', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = pausedConversation();
      conversationClient.appendEvents.mockResolvedValue(conversation);

      await lastValueFrom(
        appendResumeExecution$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of<RoundCompleteEvent>({
            type: ChatEventType.roundComplete,
            data: {
              round: createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
              resumed: true,
              resume_execution: { follow_up_round: followUpRound() },
            },
          }),
          input: { prompts: { 'tools.my_tool.confirmation': { allow: true } } },
          title$: of('Generated title'),
        }).pipe(toArray())
      );

      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.title).toBe('Generated title');
    });
  });

  describe('persistExecutionInterruption', () => {
    const T0 = '2024-01-01T00:00:00.000Z';
    const receivedAt = new Date(T0);
    const logger = loggingSystemMock.createLogger();
    const usage = { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 };
    const ref = { attachment_id: 'a1', version: 1 };
    const step = {
      type: ConversationRoundStepType.reasoning,
      reasoning: 'thinking',
    } as ConversationRoundStep;

    const freshConversation = (): ConversationWithOperation => ({
      ...createEmptyConversation({ id: 'c1' }),
      operation: 'UPDATE',
      events: [
        userMessageEvent(
          { id: 'r1::user_message', input: { message: 'hi' }, createdAt: T0 },
          createEmptyConversation({ id: 'c1' })
        ),
      ],
    });

    /** The client echoes back the events it was asked to write (a landed write). */
    const echoWrite = (client: ReturnType<typeof createConversationClientMock>) => {
      client.replaceRoundEvents.mockImplementation(async (request) => ({
        ...createEmptyConversation({ id: request.id }),
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events: request.events,
      }));
      client.appendEvents.mockImplementation(async (request) => ({
        ...createEmptyConversation({ id: request.id }),
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events: request.events,
      }));
    };

    const baseParams = (conversationClient: ReturnType<typeof createConversationClientMock>) => ({
      conversation: freshConversation(),
      conversationClient,
      roundId: 'r1',
      receivedAt,
      input: { message: 'hi' },
      logger,
    });

    const interruptedData = (overrides: Record<string, unknown> = {}) => ({
      round_id: 'r1',
      started_at: T0,
      input: { message: 'hi', attachment_refs: [ref] },
      steps: [step],
      summary: { time_to_last_token: 5, model_usage: usage },
      attachments: [],
      ...overrides,
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fresh round, failed: rewrites the round with user_message + started + steps + execution_failed', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('boom'),
        interrupted: interruptedData(),
      });

      expect(conversationClient.get).not.toHaveBeenCalled();
      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.roundId).toBe('r1');
      expect(call.skipIfTerminalExistsFor).toBe('r1::execution');
      expect(call.events.map((e) => e.id)).toEqual([
        'r1::user_message',
        'r1::execution_started',
        'r1::step::0',
        'r1::execution_failed',
      ]);
      expect(call.events[0].data).toEqual({ message: 'hi', attachment_refs: [ref] }); // processed input wins
      expect(call.events[0].created_at).toBe(T0);
      // an interrupted round is `completed` (with an `interruption`); it carries no resume state
      expect(call.status).toBe(ConversationRoundStatus.completed);
      expect(call).not.toHaveProperty('state');
      // parity: a raw Error is stored exactly as the client receives it
      expect(call.events[3].data).toEqual({
        time_to_last_token: 5,
        model_usage: usage,
        error: {
          code: AgentBuilderErrorCode.internalError,
          message: 'Error executing agent: boom',
          meta: { statusCode: 500, traceId: 'trace-1' },
          // the wrapped failure survives as the cause chain
          causes: [{ name: 'Error', message: 'boom' }],
        },
      });
      expect(written.map((e) => e.type)).toEqual([TimelineEventType.executionFailed]);
    });

    it('fresh round, aborted: writes execution_aborted without an error payload', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: createRequestAbortedError('stop'),
        interrupted: interruptedData(),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      const terminal = call.events.at(-1)!;
      expect(terminal.type).toBe(TimelineEventType.executionAborted);
      expect(terminal.data).toEqual({ time_to_last_token: 5, model_usage: usage });
      expect(written.map((e) => e.type)).toEqual([TimelineEventType.executionAborted]);
    });

    it('fresh round: the processed attachment_context is persisted on the rewritten user_message', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('boom'),
        interrupted: interruptedData({
          input: { message: 'hi', attachment_refs: [ref], attachment_context: '<attachments/>' },
        }),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.events[0].data).toMatchObject({ attachment_context: '<attachments/>' });
    });

    it('fresh round: the rebuilt user_message equals what persistUserMessage wrote', async () => {
      const receiptClient = createConversationClientMock();
      const conversation = freshConversation();
      const author: ConversationRoundAuthor = { id: 'slack-U1', username: 'bob' };
      const origin = { type: ConversationOriginType.Slack };
      await persistUserMessage({
        conversation,
        conversationClient: receiptClient,
        eventId: roundUserMessageEventId('r1'),
        receivedAt,
        input: { message: 'hi', attachment_refs: [ref] },
        author,
        origin,
      });
      const receipt = receiptClient.appendEvents.mock.calls[0][0].events[0];

      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        conversation,
        input: { message: 'hi', attachment_refs: [ref] },
        author,
        origin,
        error: new Error('boom'),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.events[0]).toEqual(receipt);
      expect(call.events[0].actor.type).toBe(EventActorType.external);
    });

    it('fresh round: chat-input and execution attachment events are written and attachments reconciled', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      const chatInput = {
        ...attachmentAddedEvent('att-in'),
        actor: { type: EventActorType.user, id: 'u1' },
        execution_id: 'r1::execution',
      } as AttachmentTimelineEvent;
      const produced = {
        ...attachmentAddedEvent('att-out'),
        type: TimelineEventType.attachmentUpdated,
        actor: { type: EventActorType.agent, id: 'agent' },
        execution_id: 'r1::execution',
      } as AttachmentTimelineEvent;
      const attachments = [{ id: 'a1' }, { id: 'a2' }] as never;

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('boom'),
        interrupted: interruptedData({
          attachments,
          attachment_events: [chatInput, produced],
          workspace_id: 'ws-1',
        }),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.attachments).toEqual({ snapshot: [], produced: attachments });
      expect(call.workspaceId).toBe('ws-1');
      const attachmentEvents = call.events.filter(isAttachmentEvent);
      expect(attachmentEvents.map((e) => [e.type, e.actor.type, e.execution_id])).toEqual([
        [TimelineEventType.attachmentAdded, EventActorType.user, 'r1::execution'],
        [TimelineEventType.attachmentUpdated, EventActorType.agent, 'r1::execution'],
      ]);
      // the terminal precedes the attachment events, after the steps
      expect(call.events.map((e) => e.type)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
        TimelineEventType.executionStep,
        TimelineEventType.executionFailed,
        TimelineEventType.attachmentAdded,
        TimelineEventType.attachmentUpdated,
      ]);
    });

    it('fresh round without round_interrupted (setup failure): minimal projection from the receipt-time input', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('registry down'),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.events.map((e) => e.id)).toEqual([
        'r1::user_message',
        'r1::execution_started',
        'r1::execution_failed',
      ]);
      expect(call.events[0].data).toEqual({ message: 'hi' });
      expect(call.events[1].created_at).toBe(T0); // startedAt falls back to receivedAt
      expect(call.events[2].data).not.toHaveProperty('model_usage');
      expect(
        typeof (call.events[2].data as { time_to_last_token: number }).time_to_last_token
      ).toBe('number');
      expect(call).not.toHaveProperty('attachments');
      expect(written).toHaveLength(1);
    });

    /**
     * An events-native document whose `r1` paused on exec_0. Its stored `rounds` say
     * `awaiting_prompt` regardless of `extraEvents`: the events decide whether the pause is pending.
     */
    const pausedConversation = (extraEvents: unknown[] = []): ConversationWithOperation => ({
      ...createEmptyConversation({ id: 'c1' }),
      operation: 'UPDATE',
      schema_version: CONVERSATION_SCHEMA_VERSION,
      rounds: [createRound({ id: 'r1', status: ConversationRoundStatus.awaitingPrompt })],
      events: [
        {
          id: 'r1::user_message',
          type: TimelineEventType.userMessage,
          created_at: T0,
          actor: { type: 'user', id: 'u1' },
          data: { message: 'hi' },
        },
        {
          id: 'r1::execution_started',
          type: TimelineEventType.executionStarted,
          created_at: T0,
          actor: { type: 'agent', id: 'agent-1' },
          execution_id: 'r1::execution',
          trigger_event_id: 'r1::user_message',
          data: { trigger_type: 'user_message' },
        },
        {
          id: 'r1::execution_terminated',
          type: TimelineEventType.executionTerminated,
          created_at: T0,
          actor: { type: 'agent', id: 'agent-1' },
          execution_id: 'r1::execution',
          trigger_event_id: 'r1::user_message',
          data: {
            model_usage: usage,
            time_to_first_token: 1,
            time_to_last_token: 1,
            outcome: { type: 'prompt_requested', prompts: [] },
          },
        },
        ...extraEvents,
      ] as never,
    });

    it('HITL resume: appends prompt_response + exec_k events with status completed, links to the last execution_terminated', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      const conversation = pausedConversation();

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        conversation,
        roundId: 'runner-round-id',
        input: { prompts: { 'tools.my_tool.confirmation': { allow: true } } },
        error: new Error('boom'),
        interrupted: interruptedData({ round_id: 'runner-round-id', input: { message: '' } }),
      });

      expect(conversationClient.replaceRoundEvents).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [call] = conversationClient.appendEvents.mock.calls[0];
      expect(call.skipIfTerminalExistsFor).toBe('r1::execution::1');
      expect(call.events[0].id).toBe('r1::prompt_response::1');
      expect(call.events[0].data).toMatchObject({
        prompt_requested_event_id: 'r1::execution_terminated',
        responses: { 'tools.my_tool.confirmation': { allow: true } },
        input: { message: '' },
      });
      expect(call.events.slice(1).map((e) => e.id)).toEqual([
        'r1::execution::1::execution_started',
        'r1::execution::1::step::0',
        'r1::execution::1::execution_failed',
      ]);
      expect(call.status).toBe(ConversationRoundStatus.completed);
      expect(call).not.toHaveProperty('state');
      expect(written.map((e) => e.id)).toEqual(['r1::execution::1::execution_failed']);
    });

    it('an interrupted resume consumed the prompt: the next interruption is a fresh round write', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      // exec_0 paused, prompt answered, exec_1 aborted -> the pause is consumed; nothing to resume
      const conversation = pausedConversation([
        {
          id: 'r1::prompt_response::1',
          type: TimelineEventType.promptResponse,
          created_at: T0,
          actor: { type: 'user', id: 'u1' },
          data: { prompt_requested_event_id: 'r1::execution_terminated', responses: {} },
        },
        {
          id: 'r1::execution::1::execution_started',
          type: TimelineEventType.executionStarted,
          created_at: T0,
          actor: { type: 'agent', id: 'agent-1' },
          execution_id: 'r1::execution::1',
          trigger_event_id: 'r1::prompt_response::1',
          data: { trigger_type: 'prompt_response' },
        },
        {
          id: 'r1::execution::1::execution_aborted',
          type: TimelineEventType.executionAborted,
          created_at: T0,
          actor: { type: 'agent', id: 'agent-1' },
          execution_id: 'r1::execution::1',
          trigger_event_id: 'r1::prompt_response::1',
          data: { time_to_last_token: 1 },
        },
      ]);

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        conversation,
        roundId: 'runner-round-id',
        error: new Error('boom'),
        interrupted: interruptedData({ round_id: 'runner-round-id' }),
      });

      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.roundId).toBe('runner-round-id');
      expect(call.status).toBe(ConversationRoundStatus.completed);
      expect(call.skipIfTerminalExistsFor).toBe('runner-round-id::execution');
    });

    it('resume without round_interrupted (setup failure on resume): prompt_response from the raw input + minimal exec_k projection', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        conversation: pausedConversation(),
        input: { message: 'answer', prompts: {} },
        error: new Error('registry down'),
      });

      const [call] = conversationClient.appendEvents.mock.calls[0];
      expect(call.events.map((e) => e.id)).toEqual([
        'r1::prompt_response::1',
        'r1::execution::1::execution_started',
        'r1::execution::1::execution_failed',
      ]);
      expect(call.events[0].data).toMatchObject({ input: { message: 'answer' } });
    });

    it('resume: attachment events are re-stamped with exec_k and attachments/workspaceId are passed', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      const attachments = [{ id: 'a1' }] as never;

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        conversation: pausedConversation(),
        input: { prompts: {} },
        error: new Error('boom'),
        interrupted: interruptedData({
          attachments,
          attachment_events: [attachmentAddedEvent('att-evt-1')],
          workspace_id: 'ws-1',
        }),
      });

      const [call] = conversationClient.appendEvents.mock.calls[0];
      expect(call.attachments).toEqual({ snapshot: [], produced: attachments });
      expect(call.workspaceId).toBe('ws-1');
      const attachmentEvent = call.events.find((e) => e.id === 'att-evt-1');
      expect(attachmentEvent?.execution_id).toBe('r1::execution::1');
    });

    it('returns [] and logs at debug when the client skipped the write (terminal already present)', async () => {
      const conversationClient = createConversationClientMock();
      // the client returns the stored document unchanged: no execution_failed in it
      conversationClient.replaceRoundEvents.mockResolvedValue({
        ...freshConversation(),
        events: [
          ...(freshConversation().events ?? []),
          {
            id: 'r1::execution_terminated',
            type: TimelineEventType.executionTerminated,
          } as never,
        ],
      });

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('boom'),
        interrupted: interruptedData(),
      });

      expect(written).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already had a terminal'));
      // the status is still requested; the skip happens inside the client
      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.status).toBe(ConversationRoundStatus.completed);
    });

    it('never throws: a failing write is logged and resolves to []', async () => {
      const conversationClient = createConversationClientMock();
      conversationClient.replaceRoundEvents.mockRejectedValue(new Error('es down'));

      const written = await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('boom'),
        interrupted: interruptedData(),
      });

      expect(written).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('es down'));
    });

    it('uses the completed round when the success write failed (completed provided, no interrupted)', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      const round = {
        ...createRound({ id: 'r1', status: ConversationRoundStatus.completed }),
        started_at: T0,
        steps: [step],
        time_to_last_token: 42,
        model_usage: usage,
        trace_id: 'trace-x',
        input: { message: 'processed', attachment_refs: [ref] },
      };

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: new Error('write failed'),
        completed: { round, attachments: [{ id: 'a1' }] as never },
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.events.map((e) => e.id)).toEqual([
        'r1::user_message',
        'r1::execution_started',
        'r1::step::0',
        'r1::execution_failed',
      ]);
      expect(call.events[0].data).toEqual({ message: 'processed', attachment_refs: [ref] });
      expect(call.events[2].data).toEqual({ step, sequence: 0 });
      expect(call.events[3].data).toMatchObject({
        time_to_last_token: 42,
        model_usage: usage,
        trace_id: 'trace-x',
        error: { message: 'Error executing agent: write failed' },
      });
      expect(call.events[3].data).not.toHaveProperty('outcome');
      expect(call.attachments).toEqual({ snapshot: [], produced: [{ id: 'a1' }] });
    });

    it('fresh round, aborted: persists the abort reason carried by the error as aborted_by', async () => {
      const conversationClient = createConversationClientMock();
      echoWrite(conversationClient);
      const abortReason = { source: 'api', actor: { id: 'u1', username: 'alice' } };

      await persistExecutionInterruption({
        ...baseParams(conversationClient),
        error: createRequestAbortedError('stop', { abort_reason: abortReason }),
        interrupted: interruptedData(),
      });

      const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
      expect(call.events.at(-1)!.data).toEqual({
        time_to_last_token: 5,
        model_usage: usage,
        aborted_by: abortReason,
      });
    });

    describe('compaction summary', () => {
      const compactionSummary = {
        summarized_up_to: { tool_call_id: 'call-1' },
        summarized_round_count: 0,
        covered_round_ids: [],
        created_at: T0,
        token_count: 10,
        structured_data: {
          discussion_summary: 's',
          user_intent: 'i',
          key_topics: [],
          entities: [],
          outcomes_and_decisions: [],
          unanswered_questions: [],
          agent_actions: [],
          tool_calls_summary: [],
        },
      };
      const storedState: NonNullable<ConversationWithOperation['state']> = { subagents: {} };

      it('fresh round: persists the summary of a compaction that ran before the interruption, keeping the rest of the state', async () => {
        const conversationClient = createConversationClientMock();
        echoWrite(conversationClient);

        await persistExecutionInterruption({
          ...baseParams(conversationClient),
          conversation: { ...freshConversation(), state: storedState },
          error: new Error('boom'),
          interrupted: interruptedData({ compaction_summary: compactionSummary }),
        });

        const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
        expect(call.state).toEqual({ ...storedState, compaction_summary: compactionSummary });
      });

      it('resume: persists the summary with the appended execution', async () => {
        const conversationClient = createConversationClientMock();
        echoWrite(conversationClient);

        await persistExecutionInterruption({
          ...baseParams(conversationClient),
          conversation: pausedConversation(),
          input: { prompts: {} },
          error: new Error('boom'),
          interrupted: interruptedData({ compaction_summary: compactionSummary }),
        });

        const [call] = conversationClient.appendEvents.mock.calls[0];
        expect(call.state).toEqual({ compaction_summary: compactionSummary });
      });

      it('leaves the state untouched when the summary is the stored one', async () => {
        const conversationClient = createConversationClientMock();
        echoWrite(conversationClient);

        await persistExecutionInterruption({
          ...baseParams(conversationClient),
          conversation: {
            ...freshConversation(),
            state: { ...storedState, compaction_summary: compactionSummary },
          },
          error: new Error('boom'),
          interrupted: interruptedData({ compaction_summary: { ...compactionSummary } }),
        });

        const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
        expect(call).not.toHaveProperty('state');
      });

      it('uses the completed conversation state when the success write failed', async () => {
        const conversationClient = createConversationClientMock();
        echoWrite(conversationClient);
        const round = {
          ...createRound({ id: 'r1', status: ConversationRoundStatus.completed }),
          started_at: T0,
        };

        await persistExecutionInterruption({
          ...baseParams(conversationClient),
          error: new Error('write failed'),
          completed: {
            round,
            conversation_state: { compaction_summary: compactionSummary },
          },
        });

        const [call] = conversationClient.replaceRoundEvents.mock.calls[0];
        expect(call.state).toEqual({ compaction_summary: compactionSummary });
      });
    });
  });
});
