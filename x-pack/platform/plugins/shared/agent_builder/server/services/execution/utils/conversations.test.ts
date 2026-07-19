/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { RoundCompleteEvent } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  ConversationAccessControlMode,
  ConversationSourceType,
} from '@kbn/agent-builder-common';
import {
  createEmptyConversation,
  createRound,
  createConversationClientMock,
} from '../../../test_utils';
import {
  applyProgressEventToRound,
  createInProgressConversation,
  createInProgressRound,
  getTemporaryConversationTitle,
  getConversation,
  updateConversation$,
} from './conversations';

describe('conversations utils', () => {
  describe('getTemporaryConversationTitle', () => {
    it('uses the prompt text as a temporary title', () => {
      expect(getTemporaryConversationTitle('  Investigate   the failing Slack workflow  ')).toBe(
        'Investigate the failing Slack workflow'
      );
    });

    it('falls back when the prompt is empty', () => {
      expect(getTemporaryConversationTitle('   ')).toBe('New conversation');
    });

    it('truncates long prompts', () => {
      expect(getTemporaryConversationTitle('a'.repeat(100))).toBe(`${'a'.repeat(79)}…`);
    });
  });

  describe('createInProgressConversation', () => {
    it('creates a visible conversation with an in-progress round', async () => {
      const conversationClient = createConversationClientMock();
      const conversation = createEmptyConversation({ id: 'conversation-1' });
      const round = createInProgressRound({ input: { message: 'hello' } });
      conversationClient.create.mockResolvedValue({ ...conversation, rounds: [round] });

      await createInProgressConversation({
        conversation,
        conversationClient,
        round,
        title: 'hello',
      });

      expect(conversationClient.create).toHaveBeenCalledWith({
        id: 'conversation-1',
        title: 'hello',
        agent_id: conversation.agent_id,
        access_control: conversation.access_control,
        source: conversation.source,
        status: ConversationRoundStatus.inProgress,
        read: false,
        rounds: [round],
      });
    });
  });

  describe('applyProgressEventToRound', () => {
    it('applies streamed message and tool updates to an in-progress round', () => {
      const round = createInProgressRound({ input: { message: 'hello' } });

      expect(
        applyProgressEventToRound({
          round,
          event: {
            type: ChatEventType.messageChunk,
            data: { message_id: 'message-1', text_chunk: 'partial' },
          },
        })
      ).toBe(true);
      expect(round.response.message).toBe('partial');

      expect(
        applyProgressEventToRound({
          round,
          event: {
            type: ChatEventType.toolCall,
            data: {
              tool_call_id: 'tool-call-1',
              tool_id: 'tool-1',
              params: { query: 'test' },
            },
          },
        })
      ).toBe(true);
      expect(round.steps).toEqual([
        expect.objectContaining({
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool-call-1',
          results: [],
        }),
      ]);

      expect(
        applyProgressEventToRound({
          round,
          event: {
            type: ChatEventType.toolProgress,
            data: { tool_call_id: 'tool-call-1', message: 'running' },
          },
        })
      ).toBe(true);
      expect(round.steps[0]).toEqual(
        expect.objectContaining({
          progression: [{ message: 'running', metadata: undefined }],
        })
      );

      expect(
        applyProgressEventToRound({
          round,
          event: {
            type: ChatEventType.toolResult,
            data: {
              tool_call_id: 'tool-call-1',
              tool_id: 'tool-1',
              results: [{ type: 'other', data: { ok: true }, tool_result_id: 'result-1' }],
            },
          },
        })
      ).toBe(true);
      expect(round.steps[0]).toEqual(
        expect.objectContaining({
          results: [{ type: 'other', data: { ok: true }, tool_result_id: 'result-1' }],
        })
      );

      expect(
        applyProgressEventToRound({
          round,
          event: {
            type: ChatEventType.messageComplete,
            data: { message_id: 'message-1', message_content: 'done' },
          },
        })
      ).toBe(true);
      expect(round.response.message).toBe('done');
    });
  });

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

      it('returns UPDATE operation when no conversationId is provided and source matches an existing conversation', async () => {
        const conversationClient = createConversationClientMock();
        const source = {
          type: ConversationSourceType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        };
        const existingConversation = createEmptyConversation({
          id: 'existing-conversation',
          source,
        });
        conversationClient.getBySource.mockResolvedValue(existingConversation);

        const result = await getConversation({
          agentId: 'test-agent',
          conversationId: undefined,
          conversationClient,
          source,
        });

        expect(result.operation).toBe('UPDATE');
        expect(result.id).toBe('existing-conversation');
        expect(conversationClient.getBySource).toHaveBeenCalledWith(source);
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
            read: false,
            status: newRound.status,
          }),
          { access: 'converse' }
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
            read: false,
            status: newRound.status,
          }),
          { access: 'converse' }
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
            read: false,
            status: newRound.status,
          }),
          { access: 'converse' }
        );
      });
    });
  });
});
