/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { RoundCompleteEvent } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import { getConversation, updateConversation$ } from './conversations';

describe('conversations utils', () => {
  describe('getConversation', () => {
    describe('resend parameter', () => {
      it('throws error when resend=true but no conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();

        await expect(
          getConversation({
            agentId: 'test-agent',
            conversationId: undefined,
            resend: true,
            conversationClient,
          })
        ).rejects.toThrow('conversation_id is required when resend is true');
      });

      it('throws error when resend=true but conversation has no rounds', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(createEmptyConversation({ rounds: [] }));

        await expect(
          getConversation({
            agentId: 'test-agent',
            conversationId: 'test-conversation',
            resend: true,
            conversationClient,
          })
        ).rejects.toThrow('Cannot resend: conversation has no rounds');
      });

      it('returns conversation with RESEND operation when resend=true and valid', async () => {
        const conversationClient = createConversationClientMock();
        const conversation = createEmptyConversation({
          rounds: [createRound({ id: 'round-1', input: { message: 'test message' } })],
        });
        conversationClient.get.mockResolvedValue(conversation);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          resend: true,
          conversationClient,
        });

        expect(result.operation).toBe('RESEND');
        expect(result.rounds).toHaveLength(1);
        expect(conversationClient.get).toHaveBeenCalledWith('test-conversation');
      });

      it('returns CREATE operation when resend=false and no conversationId', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          resend: false,
          conversationClient,
        });

        expect(result.operation).toBe('CREATE');
      });

      it('returns UPDATE operation when resend=false and conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(createEmptyConversation());

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          resend: false,
          conversationClient,
        });

        expect(result.operation).toBe('UPDATE');
      });
    });
  });

  describe('updateConversation$', () => {
    describe('resend parameter', () => {
      it('replaces last round when resend=true', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        const newRound = createRound({ id: 'round-new', input: { message: 'regenerated' } });
        const roundCompleteEvent: RoundCompleteEvent = {
          type: ChatEventType.roundComplete,
          data: {
            round: newRound,
            resumed: false,
          },
        };

        conversationClient.update.mockResolvedValue(conversation);

        const result$ = updateConversation$({
          conversationClient,
          conversation,
          title$: of('Test Title'),
          roundCompletedEvents$: of(roundCompleteEvent),
          resend: true,
        });

        await new Promise<void>((resolve) => {
          result$.subscribe({
            complete: resolve,
          });
        });

        expect(conversationClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rounds: [newRound],
          })
        );
      });

      it('appends round when resend=false', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        const newRound = createRound({ id: 'round-2', input: { message: 'new' } });
        const roundCompleteEvent: RoundCompleteEvent = {
          type: ChatEventType.roundComplete,
          data: {
            round: newRound,
            resumed: false,
          },
        };

        conversationClient.update.mockResolvedValue(conversation);

        const result$ = updateConversation$({
          conversationClient,
          conversation,
          title$: of('Test Title'),
          roundCompletedEvents$: of(roundCompleteEvent),
          resend: false,
        });

        await new Promise<void>((resolve) => {
          result$.subscribe({
            complete: resolve,
          });
        });

        expect(conversationClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rounds: [existingRound, newRound],
          })
        );
      });

      it('replaces last round when resumed=true (HITL flow)', async () => {
        const conversationClient = createConversationClientMock();
        const existingRound = createRound({ id: 'round-1', input: { message: 'original' } });
        const conversation = createEmptyConversation({ rounds: [existingRound] });

        const newRound = createRound({ id: 'round-1', input: { message: 'resumed' } });
        const roundCompleteEvent: RoundCompleteEvent = {
          type: ChatEventType.roundComplete,
          data: {
            round: newRound,
            resumed: true,
          },
        };

        conversationClient.update.mockResolvedValue(conversation);

        const result$ = updateConversation$({
          conversationClient,
          conversation,
          title$: of('Test Title'),
          roundCompletedEvents$: of(roundCompleteEvent),
          resend: false,
        });

        await new Promise<void>((resolve) => {
          result$.subscribe({
            complete: resolve,
          });
        });

        expect(conversationClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rounds: [newRound],
          })
        );
      });
    });
  });
});
