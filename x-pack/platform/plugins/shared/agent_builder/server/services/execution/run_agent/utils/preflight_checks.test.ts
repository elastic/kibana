/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseInput, AgentExecutionEvent, TimelineEvent } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, TimelineEventType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { ensureValidInput } from './preflight_checks';

describe('preflight_checks', () => {
  describe('ensureValidInput', () => {
    describe('when last round is completed (or no conversation)', () => {
      it('should not throw when message is provided', () => {
        const input: ConverseInput = { message: 'hello' };

        expect(() => ensureValidInput({ input, timelineEvents: [] })).not.toThrow();
      });

      it('should not throw when attachments are provided', () => {
        const input: ConverseInput = {
          attachments: [{ type: AttachmentType.text, data: { content: 'content' } }],
        };

        expect(() => ensureValidInput({ input, timelineEvents: [] })).not.toThrow();
      });

      it('should not throw when both message and attachments are provided', () => {
        const input: ConverseInput = {
          message: 'hello',
          attachments: [{ type: AttachmentType.text, data: { content: 'content' } }],
        };

        expect(() => ensureValidInput({ input, timelineEvents: [] })).not.toThrow();
      });

      it('should throw when no input is provided', () => {
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, timelineEvents: [] })).toThrow(
          /No standard input was provided to continue the conversation/
        );
      });

      it('should throw when only empty attachments array is provided', () => {
        const input: ConverseInput = { attachments: [] };

        expect(() => ensureValidInput({ input, timelineEvents: [] })).toThrow(
          /No standard input was provided to continue the conversation/
        );
      });

      it('should not throw with completed round in conversation', () => {
        const timelineEvents: TimelineEvent[] = [
          {
            type: TimelineEventType.agentExecution,
            status: ConversationRoundStatus.completed,
          } as AgentExecutionEvent,
        ];
        const input: ConverseInput = { message: 'next message' };

        expect(() => ensureValidInput({ input, timelineEvents })).not.toThrow();
      });

      it('should not throw when action=regenerate (input comes from last round)', () => {
        const timelineEvents: TimelineEvent[] = [
          {
            type: TimelineEventType.agentExecution,
            status: ConversationRoundStatus.completed,
          } as AgentExecutionEvent,
        ];
        const input: ConverseInput = {};

        expect(() =>
          ensureValidInput({ input, timelineEvents, action: 'regenerate' })
        ).not.toThrow();
      });
    });

    describe('when last round is awaiting prompt', () => {
      const createTimelineEventsAwaitingPrompt = (...promptIds: string[]): TimelineEvent[] => [
        {
          type: TimelineEventType.agentExecution,
          status: ConversationRoundStatus.awaitingPrompt,
          pending_prompts: promptIds.map((id) => ({
            type: AgentPromptType.confirmation,
            id,
            title: 'Confirm',
            message: 'Do you want to proceed?',
            confirm_text: 'Yes',
            cancel_text: 'No',
          })),
        } as AgentExecutionEvent,
      ];

      it('should not throw when prompt response matches pending prompt ID', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'prompt-123': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, timelineEvents })).not.toThrow();
      });

      it('should not throw when all prompt responses are provided for multiple prompts', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-1', 'prompt-2');
        const input: ConverseInput = {
          prompts: {
            'prompt-1': { allow: true },
            'prompt-2': { allow: false },
          },
        };

        expect(() => ensureValidInput({ input, timelineEvents })).not.toThrow();
      });

      it('should throw when only some prompt responses are provided for multiple prompts', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-1', 'prompt-2');
        const input: ConverseInput = {
          prompts: {
            'prompt-1': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, timelineEvents })).toThrow(
          'Conversation is awaiting prompt responses, but 1 response(s) are missing'
        );
      });

      it('should throw when no prompt response is provided', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-123');
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, timelineEvents })).toThrow(
          'Conversation is awaiting prompt responses, but 1 response(s) are missing.'
        );
      });

      it('should throw when wrong prompt ID is provided', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'wrong-prompt-id': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, timelineEvents })).toThrow(
          'Conversation is awaiting prompt responses, but 1 response(s) are missing.'
        );
      });

      it('should not throw when prompt response is denied (allow: false)', () => {
        const timelineEvents = createTimelineEventsAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'prompt-123': { allow: false },
          },
        };

        expect(() => ensureValidInput({ input, timelineEvents })).not.toThrow();
      });
    });
  });
});
