/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseInput } from '@kbn/agent-builder-common';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { createEmptyConversation } from '../../../test_utils/conversations';
import { createPromptManager, getAgentPromptStorageState, toolConfirmationId } from './prompts';

describe('prompts utilities', () => {
  describe('createPromptManager', () => {
    describe('with no initial state', () => {
      it('should return unprompted status for unknown prompt IDs', () => {
        const manager = createPromptManager();

        const result = manager.getConfirmationStatus('unknown-id');

        expect(result).toEqual({ status: ConfirmationStatus.unprompted });
      });

      it('should store and retrieve prompt responses', () => {
        const manager = createPromptManager();
        const promptResponse = {
          type: AgentPromptType.confirmation as const,
          response: { allow: true },
        };

        manager.set('test-id', promptResponse);
        const result = manager.get('test-id');

        expect(result).toEqual(promptResponse);
      });

      it('should return undefined for unknown prompt IDs when using get', () => {
        const manager = createPromptManager();

        const result = manager.get('unknown-id');

        expect(result).toBeUndefined();
      });

      it('should dump the current state', () => {
        const manager = createPromptManager();
        manager.set('prompt-1', {
          type: AgentPromptType.confirmation,
          response: { allow: true },
        });
        manager.set('prompt-2', {
          type: AgentPromptType.confirmation,
          response: { allow: false },
        });

        const state = manager.dump();

        expect(state).toEqual({
          responses: {
            'prompt-1': {
              type: AgentPromptType.confirmation,
              response: { allow: true },
            },
            'prompt-2': {
              type: AgentPromptType.confirmation,
              response: { allow: false },
            },
          },
        });
      });

      it('should clear all responses', () => {
        const manager = createPromptManager();
        manager.set('test-id', {
          type: AgentPromptType.confirmation,
          response: { allow: true },
        });

        manager.clear();

        expect(manager.get('test-id')).toBeUndefined();
        expect(manager.dump()).toEqual({ responses: {} });
      });
    });

    describe('with initial state', () => {
      it('should pre-fill responses from state', () => {
        const initialState = {
          responses: {
            'existing-prompt': {
              type: AgentPromptType.confirmation as const,
              response: { allow: true },
            },
          },
        };

        const manager = createPromptManager({ state: initialState });

        expect(manager.get('existing-prompt')).toEqual(initialState.responses['existing-prompt']);
      });

      it('should return accepted status for allowed responses', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'test-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: true },
              },
            },
          },
        });

        const result = manager.getConfirmationStatus('test-prompt');

        expect(result).toEqual({ status: ConfirmationStatus.accepted });
      });

      it('should return rejected status for denied responses', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'test-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: false },
              },
            },
          },
        });

        const result = manager.getConfirmationStatus('test-prompt');

        expect(result).toEqual({ status: ConfirmationStatus.rejected });
      });
    });

    describe('forTool', () => {
      it('should check confirmation status through tool manager', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'test-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: true },
              },
            },
          },
        });

        const toolManager = manager.forTool({
          toolId: 'test-tool',
          toolCallId: 'call-123',
          toolParams: {},
        });

        const result = toolManager.checkConfirmationStatus('test-prompt');

        expect(result).toEqual({ status: ConfirmationStatus.accepted });
      });
    });
  });

  describe('getAgentPromptStorageState', () => {
    it('should return empty state when no conversation or input prompts', () => {
      const input: ConverseInput = { message: 'hello' };

      const result = getAgentPromptStorageState({ input });

      expect(result).toEqual({ responses: {} });
    });

    it('should preserve existing conversation prompt state', () => {
      const conversation = createEmptyConversation({
        state: {
          prompt: {
            responses: {
              'existing-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: true },
              },
            },
          },
        },
      });
      const input: ConverseInput = { message: 'hello' };

      const result = getAgentPromptStorageState({ input, conversation });

      expect(result.responses['existing-prompt']).toEqual({
        type: AgentPromptType.confirmation,
        response: { allow: true },
      });
    });

    it('should merge new prompt responses from input', () => {
      const conversation = createEmptyConversation({
        state: {
          prompt: {
            responses: {
              'existing-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: true },
              },
            },
          },
        },
      });
      const input: ConverseInput = {
        prompts: {
          'new-prompt': { allow: false },
        },
      };

      const result = getAgentPromptStorageState({ input, conversation });

      expect(result.responses['existing-prompt']).toEqual({
        type: AgentPromptType.confirmation,
        response: { allow: true },
      });
      expect(result.responses['new-prompt']).toEqual({
        type: AgentPromptType.confirmation,
        response: { allow: false },
      });
    });
  });

  describe('toolConfirmationId', () => {
    it('should generate base ID for "once" mode', () => {
      const result = toolConfirmationId({
        toolId: 'my-tool',
        toolCallId: 'call-123',
        policyMode: 'once',
      });

      expect(result).toBe('tools.my-tool.confirmation');
    });

    it('should generate unique ID per toolCallId for "always" mode', () => {
      const result = toolConfirmationId({
        toolId: 'my-tool',
        toolCallId: 'call-123',
        policyMode: 'always',
      });

      expect(result).toBe('tools.my-tool.confirmation.call-123');
    });
  });
});
