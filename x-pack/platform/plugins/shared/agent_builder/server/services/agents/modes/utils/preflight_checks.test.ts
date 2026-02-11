/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import { ensureValidInput } from './preflight_checks';

describe('preflight_checks', () => {
  describe('ensureValidInput', () => {
    describe('when last round is completed (or no conversation)', () => {
      it('should not throw when message is provided', () => {
        const input: ConverseInput = { message: 'hello' };

        expect(() => ensureValidInput({ input })).not.toThrow();
      });

      it('should not throw when attachments are provided', () => {
        const input: ConverseInput = {
          attachments: [{ type: AttachmentType.text, data: { content: 'content' } }],
        };

        expect(() => ensureValidInput({ input })).not.toThrow();
      });

      it('should not throw when both message and attachments are provided', () => {
        const input: ConverseInput = {
          message: 'hello',
          attachments: [{ type: AttachmentType.text, data: { content: 'content' } }],
        };

        expect(() => ensureValidInput({ input })).not.toThrow();
      });

      it('should throw when no input is provided', () => {
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input })).toThrow(
          /No standard input was provided to continue the conversation/
        );
      });

      it('should throw when only empty attachments array is provided', () => {
        const input: ConverseInput = { attachments: [] };

        expect(() => ensureValidInput({ input })).toThrow(
          /No standard input was provided to continue the conversation/
        );
      });

      it('should not throw with completed round in conversation', () => {
        const conversation = createEmptyConversation({
          rounds: [createRound({ status: ConversationRoundStatus.completed })],
        });
        const input: ConverseInput = { message: 'next message' };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should not throw when action=regenerate (input comes from last round)', () => {
        const conversation = createEmptyConversation({
          rounds: [createRound({ status: ConversationRoundStatus.completed })],
        });
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, conversation, action: 'regenerate' })).not.toThrow();
      });
    });

    describe('when last round is awaiting prompt', () => {
      const createConversationAwaitingPrompt = (promptId: string) =>
        createEmptyConversation({
          rounds: [
            createRound({
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompt: {
                type: AgentPromptType.confirmation,
                id: promptId,
                title: 'Confirm',
                message: 'Do you want to proceed?',
                confirm_text: 'Yes',
                cancel_text: 'No',
              },
            }),
          ],
        });

      it('should not throw when prompt response matches pending prompt ID', () => {
        const conversation = createConversationAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'prompt-123': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should throw when no prompt response is provided', () => {
        const conversation = createConversationAwaitingPrompt('prompt-123');
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting a prompt response, but none was provided/
        );
      });

      it('should throw when wrong prompt ID is provided', () => {
        const conversation = createConversationAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'wrong-prompt-id': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting a prompt response, but none was provided/
        );
      });

      it('should not throw when prompt response is denied (allow: false)', () => {
        const conversation = createConversationAwaitingPrompt('prompt-123');
        const input: ConverseInput = {
          prompts: {
            'prompt-123': { allow: false },
          },
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });
    });
  });
});
