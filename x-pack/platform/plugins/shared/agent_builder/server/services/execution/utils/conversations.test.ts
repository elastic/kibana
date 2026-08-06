/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { Conversation, RoundCompleteEvent } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationAccessControlMode,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import { getConversation, updateConversation$ } from './conversations';

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
        });
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
});
