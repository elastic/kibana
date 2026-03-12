/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { type RoundCompleteEvent, ChatEventType } from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import { createConversation$, getConversation, updateConversation$ } from './conversations';

describe('conversations utils', () => {
  describe('getConversation', () => {
    describe('operation determination', () => {
      it('returns CREATE operation when no conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
          anonymizationEnabled: true,
        });

        expect(result.operation).toBe('CREATE');
      });

      it('returns UPDATE operation when conversationId is provided', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(createEmptyConversation());

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          conversationClient,
          anonymizationEnabled: true,
        });

        expect(result.operation).toBe('UPDATE');
        expect(conversationClient.get).toHaveBeenCalledWith('test-conversation');
      });

      it('assigns replacementsId when legacy conversation does not have one', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(
          createEmptyConversation({ replacementsId: undefined })
        );

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          conversationClient,
          anonymizationEnabled: true,
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.replacementsId).toBeDefined();
      });

      it('returns CREATE operation when autoCreateConversationWithId=true and conversation does not exist', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.exists.mockResolvedValue(false);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'new-conversation',
          autoCreateConversationWithId: true,
          conversationClient,
          anonymizationEnabled: true,
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
          anonymizationEnabled: true,
        });

        expect(result.operation).toBe('UPDATE');
      });

      it('does not assign replacementsId when anonymization is disabled', async () => {
        const conversationClient = createConversationClientMock();
        conversationClient.get.mockResolvedValue(
          createEmptyConversation({ replacementsId: undefined })
        );

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: 'test-conversation',
          conversationClient,
          anonymizationEnabled: false,
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.replacementsId).toBeUndefined();
      });
    });
  });

  describe('updateConversation$', () => {
    it('persists inference-returned replacements id when present', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = createEmptyConversation({ replacementsId: 'existing-id' });
      const newRound = createRound({ id: 'round-2', input: { message: 'new' } });
      const roundCompleteEvent: RoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: newRound,
          replacements_id: 'inference-id',
        },
      };

      conversationClient.update.mockResolvedValue(conversation);

      const result$ = updateConversation$({
        conversationClient,
        conversation,
        title$: of('Test Title'),
        roundCompletedEvents$: of(roundCompleteEvent),
      });

      await new Promise<void>((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(conversationClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          replacementsId: 'inference-id',
        })
      );
    });

    describe('action parameter', () => {
      it('replaces last round when action=regenerate', async () => {
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
          action: 'regenerate',
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

      it('appends round when no action is provided', async () => {
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

      it('replaces last round when resumed=true (HITL flow, auto-detected)', async () => {
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
          // No action - auto-detected resume via resumed flag
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

  describe('createConversation$', () => {
    it('falls back to provided replacements id when event does not include one', async () => {
      const conversationClient = createConversationClientMock();
      const newRound = createRound({ id: 'round-1', input: { message: 'new' } });
      const roundCompleteEvent: RoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: newRound,
        },
      };
      conversationClient.create.mockResolvedValue(createEmptyConversation());

      const result$ = createConversation$({
        agentId: 'test-agent',
        conversationClient,
        conversationId: 'conversation-id',
        replacementsId: 'fallback-replacements-id',
        title$: of('Test Title'),
        roundCompletedEvents$: of(roundCompleteEvent),
      });

      await new Promise<void>((resolve) => {
        result$.subscribe({ complete: resolve });
      });

      expect(conversationClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          replacementsId: 'fallback-replacements-id',
        })
      );
    });
  });
});
