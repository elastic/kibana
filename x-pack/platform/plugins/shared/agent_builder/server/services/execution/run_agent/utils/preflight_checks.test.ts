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

const makeFormPromptPending = (...promptIds: string[]) =>
  createEmptyConversation({
    rounds: [
      createRound({
        pending_prompts: promptIds.map((id) => ({
          agent_context: undefined,
          execution_id: `exec-${id}`,
          id,
          message: 'Please fill in the form.',
          schema: {},
          step_execution_id: `step-${id}`,
          type: AgentPromptType.form,
        })),
        status: ConversationRoundStatus.awaitingPrompt,
      }),
    ],
  });

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
      const createConversationAwaitingPrompt = (...promptIds: string[]) =>
        createEmptyConversation({
          rounds: [
            createRound({
              status: ConversationRoundStatus.awaitingPrompt,
              pending_prompts: promptIds.map((id) => ({
                type: AgentPromptType.confirmation,
                id,
                title: 'Confirm',
                message: 'Do you want to proceed?',
                confirm_text: 'Yes',
                cancel_text: 'No',
              })),
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

      it('should not throw when all prompt responses are provided for multiple prompts', () => {
        const conversation = createConversationAwaitingPrompt('prompt-1', 'prompt-2');
        const input: ConverseInput = {
          prompts: {
            'prompt-1': { allow: true },
            'prompt-2': { allow: false },
          },
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should throw when no prompt response is provided', () => {
        const conversation = createConversationAwaitingPrompt('prompt-123');
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
        );
      });

      it('should throw when only some prompt responses are provided for multiple prompts', () => {
        const conversation = createConversationAwaitingPrompt('prompt-1', 'prompt-2');
        const input: ConverseInput = {
          prompts: {
            'prompt-1': { allow: true },
          },
        };

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
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
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
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

    describe('when last round is awaiting a form prompt', () => {
      it('should not throw when form prompt response matches pending prompt ID', () => {
        const conversation = makeFormPromptPending('form-123');
        const input: ConverseInput = {
          form_prompts: [{ execution_id: 'exec-form-123', id: 'form-123', values: {} }],
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should not throw when all form prompt responses are provided for multiple prompts', () => {
        const conversation = makeFormPromptPending('form-1', 'form-2');
        const input: ConverseInput = {
          form_prompts: [
            { execution_id: 'exec-form-1', id: 'form-1', values: { approved: true } },
            { execution_id: 'exec-form-2', id: 'form-2', values: { approved: false } },
          ],
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should throw when no form prompt response is provided', () => {
        const conversation = makeFormPromptPending('form-123');
        const input: ConverseInput = {};

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
        );
      });

      it('should throw when only some form prompt responses are provided', () => {
        const conversation = makeFormPromptPending('form-1', 'form-2');
        const input: ConverseInput = {
          form_prompts: [{ execution_id: 'exec-form-1', id: 'form-1', values: {} }],
        };

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
        );
      });

      it('should throw when wrong form prompt ID is provided', () => {
        const conversation = makeFormPromptPending('form-123');
        const input: ConverseInput = {
          form_prompts: [{ execution_id: 'exec-wrong', id: 'wrong-form-id', values: {} }],
        };

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
        );
      });

      it('should not throw when a second step was newly appended by resumeFormPrompts for the same execution', () => {
        // After step1 is submitted, resumeFormPrompts appends step2 to pending_prompts
        // (same execution_id, different id/step_execution_id). step2 has no response yet —
        // ensureValidInput must not reject it as "missing".
        const conversation = createEmptyConversation({
          rounds: [
            createRound({
              pending_prompts: [
                {
                  agent_context: undefined,
                  execution_id: 'exec-workflow',
                  id: 'step-exec-1',
                  message: 'Step 1',
                  schema: {},
                  step_execution_id: 'step-exec-1',
                  type: AgentPromptType.form,
                },
                {
                  agent_context: undefined,
                  execution_id: 'exec-workflow',
                  id: 'step-exec-2',
                  message: 'Step 2',
                  schema: {},
                  step_execution_id: 'step-exec-2',
                  type: AgentPromptType.form,
                },
              ],
              status: ConversationRoundStatus.awaitingPrompt,
            }),
          ],
        });
        // User submitted only step1; step2 is newly appended and has no response yet.
        const input: ConverseInput = {
          form_prompts: [{ execution_id: 'exec-workflow', id: 'step-exec-1', values: {} }],
        };

        expect(() => ensureValidInput({ input, conversation })).not.toThrow();
      });

      it('should throw when only some form prompt responses are provided for different executions', () => {
        // Two prompts from different workflow executions — both need responses.
        const conversation = makeFormPromptPending('form-1', 'form-2');
        const input: ConverseInput = {
          form_prompts: [{ execution_id: 'exec-form-1', id: 'form-1', values: {} }],
        };

        expect(() => ensureValidInput({ input, conversation })).toThrow(
          /Conversation is awaiting prompt responses, but 1 response\(s\) are missing/
        );
      });
    });
  });
});
