/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  ChatEvent,
  Conversation,
  ConversationRoundAuthor,
  RoundCompleteEvent,
  RoundStartedEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  createConversationAlreadyExistsError,
  createConversationNotFoundError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import type { ConversationWithOperation } from './conversations';
import {
  appendRoundTerminated$,
  getConversation,
  startConversation$,
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

  describe('startConversation$', () => {
    /** Minimal factory that mirrors what `run_chat_agent` emits at roundStart. */
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

    const runStart = async ({
      conversation,
      conversationClient,
      startEvent,
    }: {
      conversation: ConversationWithOperation;
      conversationClient: ReturnType<typeof createConversationClientMock>;
      startEvent: RoundStartedEvent;
    }) => {
      conversationClient.appendEvents.mockResolvedValue(conversation);
      const events$ = startConversation$({
        conversation,
        conversationClient,
        roundStartedEvents$: of(startEvent),
      });
      await lastValueFrom(events$, { defaultValue: undefined });
    };

    it('creates the doc with a placeholder title then appends the two start events for a CREATE', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(
        createEmptyConversation({ id: 'conv-1', agent_id: 'agent-1' }),
        'CREATE'
      );
      const author: ConversationRoundAuthor = { id: 'u1', username: 'u1' };

      await runStart({
        conversation,
        conversationClient,
        startEvent: makeStartEvent({
          round_id: 'round-1',
          input: { message: 'hi' },
          started_at: '2024-01-01T00:00:00.000Z',
          author,
        }),
      });

      expect(conversationClient.create).toHaveBeenCalledTimes(1);
      const [createArgs] = conversationClient.create.mock.calls[0];
      expect(createArgs.id).toBe('conv-1');
      expect(createArgs.title).toBe(DEFAULT_CONVERSATION_TITLE);
      expect(createArgs.rounds).toEqual([]);

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
      const [appendArgs] = conversationClient.appendEvents.mock.calls[0];
      expect(appendArgs.id).toBe('conv-1');
      const startEvents = appendArgs.events;
      expect(startEvents).toHaveLength(2);
      expect(startEvents[0]).toMatchObject({
        id: 'round-1::user_message',
        type: 'user_message',
      });
      expect(startEvents[1]).toMatchObject({
        id: 'round-1::execution_started',
        type: 'execution_started',
        execution_id: 'round-1::execution',
      });
    });

    it('skips create for UPDATE but still appends the start events', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'UPDATE');

      await runStart({
        conversation,
        conversationClient,
        startEvent: makeStartEvent(),
      });

      expect(conversationClient.create).not.toHaveBeenCalled();
      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
    });

    it('swallows conversationAlreadyExists on CREATE (race with another writer) and still appends', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'CREATE');
      conversationClient.create.mockRejectedValueOnce(
        createConversationAlreadyExistsError({ conversationId: 'conv-1' })
      );

      await runStart({
        conversation,
        conversationClient,
        startEvent: makeStartEvent(),
      });

      expect(conversationClient.appendEvents).toHaveBeenCalledTimes(1);
    });

    it('propagates unexpected create errors', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'conv-1' }), 'CREATE');
      const boom = new Error('boom');
      conversationClient.create.mockRejectedValueOnce(boom);

      const events$ = startConversation$({
        conversation,
        conversationClient,
        roundStartedEvents$: of(makeStartEvent()),
      });
      await expect(lastValueFrom(events$, { defaultValue: undefined })).rejects.toBe(boom);
      expect(conversationClient.appendEvents).not.toHaveBeenCalled();
    });

    it('emits no chat events itself (side effects only)', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = withOperation(createEmptyConversation({ id: 'c' }), 'UPDATE');
      conversationClient.appendEvents.mockResolvedValue(conversation);

      const emitted = await lastValueFrom(
        startConversation$({
          conversation,
          conversationClient,
          roundStartedEvents$: of(makeStartEvent()),
        }).pipe(toArray())
      );
      expect(emitted).toEqual([]);
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

    it('appends the execution_terminated event and folds title + status into the same write for CREATE', async () => {
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
      expect(args.events).toHaveLength(1);
      expect(args.events[0]).toMatchObject({
        id: 'round-1::execution_terminated',
        type: 'execution_terminated',
        execution_id: 'round-1::execution',
      });

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
  });
});
