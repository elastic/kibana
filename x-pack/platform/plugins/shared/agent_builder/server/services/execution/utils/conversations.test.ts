/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, Subject, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  ChatEvent,
  Conversation,
  ConversationRoundAuthor,
  ConversationRoundStep,
  RoundCompleteEvent,
  RoundStartedEvent,
  RoundStepEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import type { ConversationWithOperation } from './conversations';
import {
  STEP_FLUSH_MS,
  appendExecutionStarted$,
  appendRoundTerminated$,
  createInFlightWrites,
  getConversation,
  persistRoundInput$,
  streamRoundSteps$,
  updateConversation$,
} from './conversations';

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

  describe('updateConversation$', () => {
    const runUpdate = async ({
      conversationClient,
      conversation,
      roundCompleteEvent,
      action,
    }: {
      conversationClient: ReturnType<typeof createConversationClientMock>;
      conversation: Conversation;
      roundCompleteEvent: RoundCompleteEvent;
      action?: 'regenerate';
    }) => {
      conversationClient.upsertRound.mockResolvedValue(conversation);

      const result$ = updateConversation$({
        conversationClient,
        conversation,
        roundCompletedEvents$: of(roundCompleteEvent),
        ...(action ? { action } : {}),
      });

      await new Promise<void>((resolve) => {
        result$.subscribe({
          complete: resolve,
        });
      });
    };

    describe('action parameter', () => {
      it('names the superseded round when action=regenerate', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        // regenerate mints a new round id, so the superseded round must be named
        const newRound = createRound({ id: 'round-new', input: { message: 'regenerated' } });

        await runUpdate({
          conversationClient,
          conversation,
          action: 'regenerate',
          roundCompleteEvent: {
            type: ChatEventType.roundComplete,
            data: { round: newRound, resumed: false },
          },
        });

        expect(conversationClient.upsertRound).toHaveBeenCalledWith(
          expect.objectContaining({
            round: newRound,
            replacesRoundId: 'round-1',
          }),
          { access: 'converse' }
        );
      });

      it('passes only the new round when no action is provided', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        const newRound = createRound({ id: 'round-2', input: { message: 'new' } });

        await runUpdate({
          conversationClient,
          conversation,
          roundCompleteEvent: {
            type: ChatEventType.roundComplete,
            data: { round: newRound, resumed: false },
          },
        });

        expect(conversationClient.upsertRound).toHaveBeenCalledWith(
          expect.objectContaining({
            round: newRound,
          }),
          { access: 'converse' }
        );
        expect(conversationClient.upsertRound).not.toHaveBeenCalledWith(
          expect.objectContaining({ replacesRoundId: expect.anything() }),
          expect.anything()
        );
      });

      it('relies on the round id alone when resumed=true (HITL flow)', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        // a resumed round keeps the pending round's id, so it is matched by id
        const newRound = createRound({ id: 'round-1', input: { message: 'resumed' } });

        await runUpdate({
          conversationClient,
          conversation,
          roundCompleteEvent: {
            type: ChatEventType.roundComplete,
            data: { round: newRound, resumed: true },
          },
        });

        expect(conversationClient.upsertRound).toHaveBeenCalledWith(
          expect.objectContaining({
            round: newRound,
          }),
          { access: 'converse' }
        );
        expect(conversationClient.upsertRound).not.toHaveBeenCalledWith(
          expect.objectContaining({ replacesRoundId: expect.anything() }),
          expect.anything()
        );
      });
    });

    it('never passes a rounds array, so a stale snapshot cannot be written', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = createEmptyConversation({
        rounds: [createRound({ id: 'round-1', input: { message: 'original' } })],
      });

      await runUpdate({
        conversationClient,
        conversation,
        roundCompleteEvent: {
          type: ChatEventType.roundComplete,
          data: { round: createRound({ id: 'round-2' }), resumed: false },
        },
      });

      const [request] = conversationClient.upsertRound.mock.calls[0];
      expect(request).not.toHaveProperty('rounds');
      expect(request).not.toHaveProperty('title');
    });
  });

  describe('persistRoundInput$ (receipt-time input write)', () => {
    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    const runReceipt = async ({
      conversation,
      conversationClient,
      roundId = 'round-1',
      receivedAt = new Date('2024-01-01T00:00:00.000Z'),
      input = { message: 'hi' },
      author,
    }: {
      conversation: ConversationWithOperation;
      conversationClient: ReturnType<typeof createConversationClientMock>;
      roundId?: string;
      receivedAt?: Date;
      input?: { message?: string };
      author?: ConversationRoundAuthor;
    }) => {
      conversationClient.appendEvents.mockResolvedValue(conversation);
      const inFlightWrites = createInFlightWrites();
      const events$ = persistRoundInput$({
        conversation,
        conversationClient,
        roundId,
        receivedAt,
        input,
        author,
        inFlightWrites,
      });
      await lastValueFrom(events$, { defaultValue: undefined });
      await inFlightWrites.settled();
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

      const events$ = persistRoundInput$({
        conversation,
        conversationClient,
        roundId: 'round-1',
        receivedAt: new Date(),
        input: { message: 'hi' },
        inFlightWrites: createInFlightWrites(),
      });
      await expect(lastValueFrom(events$, { defaultValue: undefined })).rejects.toBe(boom);
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

    it('emits no chat events itself (side effects only)', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      conversationClient.appendEvents.mockResolvedValue(conversation);

      const emitted = await lastValueFrom(
        persistRoundInput$({
          conversation,
          conversationClient,
          roundId: 'round-1',
          receivedAt: new Date(),
          input: { message: 'hi' },
          inFlightWrites: createInFlightWrites(),
        }).pipe(toArray())
      );
      expect(emitted).toEqual([]);
    });
  });

  describe('appendExecutionStarted$ (run-start write)', () => {
    const makeStartEvent = (parts: Partial<RoundStartedEvent['data']> = {}): RoundStartedEvent => ({
      type: ChatEventType.roundStarted,
      data: {
        round_id: 'round-1',
        input: { message: 'hi' },
        started_at: '2024-01-01T00:00:00.000Z',
        ...parts,
      },
    });

    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    it('appends a single execution_started event (no user_message, no create call)', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE');
      conversationClient.appendEvents.mockResolvedValue(conversation);
      const inFlightWrites = createInFlightWrites();

      const events$ = appendExecutionStarted$({
        conversation,
        conversationClient,
        roundStartedEvents$: of(makeStartEvent()),
        inFlightWrites,
      });
      await lastValueFrom(events$, { defaultValue: undefined });
      await inFlightWrites.settled();

      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [appendArgs] = conversationClient.appendEvents.mock.calls[0];
      expect(appendArgs.events).toHaveLength(1);
      expect(appendArgs.events[0]).toMatchObject({
        id: 'round-1::execution_started',
        type: TimelineEventType.executionStarted,
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
      });
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
      conversationClient.appendEvents.mockResolvedValue(conversation);
      return lastValueFrom(
        appendRoundTerminated$({
          conversation,
          conversationClient,
          roundCompletedEvents$: of(roundCompleteEvent),
          ...(title$ ? { title$ } : {}),
        }).pipe(toArray())
      );
    };

    it('overwrites the full canonical projection (user_message + execution_started + terminated) and folds title + status into the same write for CREATE', async () => {
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

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.id).toBe('conv-1');
      expect(args.title).toBe('Generated title');
      expect(args.status).toBe(ConversationRoundStatus.completed);
      expect(args.overwrite).toBe(true);
      // Round-end write is a full canonical projection: the receipt-time raw user_message
      // and mid-run execution_started are replaced in place with the canonical events.
      expect(args.events.map((event: { id: string }) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
      ]);

      expect(emitted).toHaveLength(1);
      expect(emitted[0].type).toBe(ChatEventType.conversationCreated);
    });

    it('emits conversationUpdated for UPDATE', async () => {
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

      expect(emitted).toHaveLength(1);
      expect(emitted[0].type).toBe(ChatEventType.conversationUpdated);
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

      const [args] = conversationClient.appendEvents.mock.calls[0];
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

      const [args] = conversationClient.appendEvents.mock.calls[0];
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

      const [args] = conversationClient.appendEvents.mock.calls[0];
      expect(args.overwrite).toBe(true);
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

  describe('streamRoundSteps$', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    const withOperation = (
      conversation: Conversation,
      operation: 'CREATE' | 'UPDATE'
    ): ConversationWithOperation => ({ ...conversation, operation });

    const stepEvent = (roundId: string, sequence: number): RoundStepEvent => ({
      type: ChatEventType.executionStep,
      data: {
        round_id: roundId,
        execution_id: `${roundId}::execution`,
        step: {
          type: ConversationRoundStepType.reasoning,
          reasoning: `step-${sequence}`,
        } as ConversationRoundStep,
        sequence,
      },
    });

    it('debounces a burst of step events into a single `appendEvents` call and dedupes by id', async () => {
      const conversationClient = createConversationClientMock();
      conversationClient.appendEvents.mockResolvedValue(createEmptyConversation({ id: 'c1' }));
      const conversation = withOperation(createEmptyConversation({ id: 'c1' }), 'UPDATE');

      const stepEvents$ = new Subject<RoundStepEvent>();
      const done = lastValueFrom(
        streamRoundSteps$({
          conversation,
          conversationClient,
          roundStepEvents$: stepEvents$,
          inFlightWrites: createInFlightWrites(),
          logger: loggerMock.create(),
        }).pipe(toArray())
      );

      stepEvents$.next(stepEvent('round-1', 0));
      stepEvents$.next(stepEvent('round-1', 1));
      stepEvents$.next(stepEvent('round-1', 2));

      // Nothing flushed yet — the debounce window has not elapsed.
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();

      jest.advanceTimersByTime(STEP_FLUSH_MS);
      // Allow the microtask queue (concatMap -> from(promise)) to drain.
      await Promise.resolve();

      stepEvents$.complete();
      await done;

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [args] = conversationClient.appendEvents.mock.calls[0];
      // Ids follow the `${roundId}::step::${sequence}` convention shared with `roundStepEvents`
      // so streamed and reconciled projections dedupe cleanly.
      expect(args.events.map((event: { id: string }) => event.id)).toEqual([
        'round-1::step::0',
        'round-1::step::1',
        'round-1::step::2',
      ]);
      expect(
        args.events.every(
          (event: { type: string }) => event.type === TimelineEventType.executionStep
        )
      ).toBe(true);
    });

    it('is side-effect only (emits no chat events into the outward stream)', async () => {
      const conversationClient = createConversationClientMock();
      conversationClient.appendEvents.mockResolvedValue(createEmptyConversation({ id: 'c1' }));
      const conversation = withOperation(createEmptyConversation({ id: 'c1' }), 'UPDATE');

      const stepEvents$ = new Subject<RoundStepEvent>();
      const emittedPromise = lastValueFrom(
        streamRoundSteps$({
          conversation,
          conversationClient,
          roundStepEvents$: stepEvents$,
          inFlightWrites: createInFlightWrites(),
          logger: loggerMock.create(),
        }).pipe(toArray())
      );

      stepEvents$.next(stepEvent('round-1', 0));
      jest.advanceTimersByTime(STEP_FLUSH_MS);
      await Promise.resolve();
      stepEvents$.complete();

      const emitted = await emittedPromise;
      expect(emitted).toEqual([]);
    });

    it('treats a failed flush as best-effort: logs a warning and keeps the stream alive for later flushes', async () => {
      const conversationClient = createConversationClientMock();
      conversationClient.appendEvents
        .mockRejectedValueOnce(new Error('es blip'))
        .mockResolvedValue(createEmptyConversation({ id: 'c1' }));
      const conversation = withOperation(createEmptyConversation({ id: 'c1' }), 'UPDATE');
      const logger = loggerMock.create();

      const stepEvents$ = new Subject<RoundStepEvent>();
      const done = lastValueFrom(
        streamRoundSteps$({
          conversation,
          conversationClient,
          roundStepEvents$: stepEvents$,
          inFlightWrites: createInFlightWrites(),
          logger,
        }).pipe(toArray())
      );

      // First flush fails…
      stepEvents$.next(stepEvent('round-1', 0));
      jest.advanceTimersByTime(STEP_FLUSH_MS);
      await Promise.resolve();
      await Promise.resolve();

      // …the second flush still runs and the stream completes without error.
      stepEvents$.next(stepEvent('round-1', 1));
      jest.advanceTimersByTime(STEP_FLUSH_MS);
      await Promise.resolve();
      stepEvents$.complete();

      await expect(done).resolves.toEqual([]);
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es blip'));
    });

    it('registers every flush with the in-flight tracker so teardown can wait for it', async () => {
      const conversationClient = createConversationClientMock();
      let resolveFlush!: (value: Conversation) => void;
      conversationClient.appendEvents.mockReturnValue(
        new Promise<Conversation>((resolve) => {
          resolveFlush = resolve;
        })
      );
      const conversation = withOperation(createEmptyConversation({ id: 'c1' }), 'UPDATE');
      const inFlightWrites = createInFlightWrites();

      const stepEvents$ = new Subject<RoundStepEvent>();
      const subscription = streamRoundSteps$({
        conversation,
        conversationClient,
        roundStepEvents$: stepEvents$,
        inFlightWrites,
        logger: loggerMock.create(),
      }).subscribe();

      stepEvents$.next(stepEvent('round-1', 0));
      jest.advanceTimersByTime(STEP_FLUSH_MS);
      await Promise.resolve();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);

      // Unsubscribing does not cancel the dispatched write; `settled` must wait for it.
      subscription.unsubscribe();
      let settledResolved = false;
      const settledPromise = inFlightWrites.settled().then(() => {
        settledResolved = true;
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(settledResolved).toBe(false);

      resolveFlush(createEmptyConversation({ id: 'c1' }));
      await settledPromise;
      expect(settledResolved).toBe(true);
    });
  });

  describe('createInFlightWrites', () => {
    it('settled resolves even when a tracked write rejects, and drains writes added while waiting', async () => {
      const inFlightWrites = createInFlightWrites();

      let rejectFirst!: (error: Error) => void;
      inFlightWrites
        .track(
          new Promise<void>((_, reject) => {
            rejectFirst = reject;
          })
        )
        .catch(() => {
          // The caller handles the rejection; the tracker only waits for settlement.
        });

      let resolveSecond!: () => void;
      let settledResolved = false;
      const settledPromise = inFlightWrites.settled().then(() => {
        settledResolved = true;
      });

      // While the first write is pending, dispatch a second one — settled must wait for both.
      void inFlightWrites.track(
        new Promise<void>((resolve) => {
          resolveSecond = resolve;
        })
      );

      rejectFirst(new Error('write failed'));
      await Promise.resolve();
      await Promise.resolve();
      expect(settledResolved).toBe(false);

      resolveSecond();
      await settledPromise;
      expect(settledResolved).toBe(true);
    });
  });
});
