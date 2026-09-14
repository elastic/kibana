/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  AuthorizationStatus,
  ConfirmationStatus,
} from '@kbn/agent-builder-common/agents/prompts';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
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

      it('returns an authorization prompt payload from askForAuthorization', () => {
        const manager = createPromptManager();

        const toolManager = manager.forTool({
          toolId: 'test-tool',
          toolCallId: 'call-123',
          toolParams: {},
        });

        const result = toolManager.askForAuthorization({
          id: 'tools.test-tool.authorization.conn-1',
          connector_id: 'conn-1',
          connector_name: 'Slack',
          connector_type: '.slack2',
          auth_method: 'oauth_authorization_code',
        });

        expect(result).toEqual({
          prompt: {
            type: AgentPromptType.authorization,
            id: 'tools.test-tool.authorization.conn-1',
            connector_id: 'conn-1',
            connector_name: 'Slack',
            connector_type: '.slack2',
            auth_method: 'oauth_authorization_code',
          },
        });
      });
    });

    describe('authorization status', () => {
      it('returns unprompted when no entry exists', () => {
        const manager = createPromptManager();

        expect(manager.getAuthorizationStatus('unknown')).toEqual({
          status: AuthorizationStatus.unprompted,
        });
      });

      it('returns authorized when the user authorized', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'auth-prompt': {
                type: AgentPromptType.authorization,
                response: { authorized: true },
              },
            },
          },
        });

        expect(manager.getAuthorizationStatus('auth-prompt')).toEqual({
          status: AuthorizationStatus.authorized,
        });
      });

      it('returns declined when the user declined', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'auth-prompt': {
                type: AgentPromptType.authorization,
                response: { authorized: false },
              },
            },
          },
        });

        expect(manager.getAuthorizationStatus('auth-prompt')).toEqual({
          status: AuthorizationStatus.declined,
        });
      });

      it('throws when called against a confirmation entry', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'conf-prompt': {
                type: AgentPromptType.confirmation,
                response: { allow: true },
              },
            },
          },
        });

        expect(() => manager.getAuthorizationStatus('conf-prompt')).toThrow(
          'Trying to check authorization status of non-authorization prompt.'
        );
      });

      it('getConfirmationStatus throws when called against an authorization entry', () => {
        const manager = createPromptManager({
          state: {
            responses: {
              'auth-prompt': {
                type: AgentPromptType.authorization,
                response: { authorized: true },
              },
            },
          },
        });

        expect(() => manager.getConfirmationStatus('auth-prompt')).toThrow(
          'Trying to check confirmation status of non-confirmation prompt.'
        );
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

    it('discriminates confirmation and authorization responses when merging from input', () => {
      const input: ConverseInput = {
        prompts: {
          'conf-prompt': { allow: true },
          'auth-prompt': { authorized: true },
        },
      };

      const result = getAgentPromptStorageState({ input });

      expect(result.responses['conf-prompt']).toEqual({
        type: AgentPromptType.confirmation,
        response: { allow: true },
      });
      expect(result.responses['auth-prompt']).toEqual({
        type: AgentPromptType.authorization,
        response: { authorized: true },
      });
    });

    describe('authorization scoping', () => {
      const declinedResponse = {
        type: AgentPromptType.authorization as const,
        response: { authorized: false },
      };
      const authorizedResponse = {
        type: AgentPromptType.authorization as const,
        response: { authorized: true },
      };
      const confirmationResponse = {
        type: AgentPromptType.confirmation as const,
        response: { allow: true },
      };

      const conversationWith = ({
        lastRoundStatus,
        responses,
      }: {
        lastRoundStatus: ConversationRoundStatus;
        responses: Record<
          string,
          typeof declinedResponse | typeof authorizedResponse | typeof confirmationResponse
        >;
      }) =>
        createEmptyConversation({
          rounds: [createRound({ status: lastRoundStatus })],
          state: { prompt: { responses } },
        });

      it('drops carried-over declined authorization responses when starting a new round', () => {
        const conversation = conversationWith({
          lastRoundStatus: ConversationRoundStatus.completed,
          responses: { 'auth-prompt': declinedResponse },
        });

        const result = getAgentPromptStorageState({ input: { message: 'hello' }, conversation });

        expect(result.responses['auth-prompt']).toBeUndefined();
      });

      it('drops carried-over authorized responses when starting a new round', () => {
        const conversation = conversationWith({
          lastRoundStatus: ConversationRoundStatus.completed,
          responses: { 'auth-prompt': authorizedResponse },
        });

        const result = getAgentPromptStorageState({ input: { message: 'hello' }, conversation });

        expect(result.responses['auth-prompt']).toBeUndefined();
      });

      it('keeps carried-over authorization responses when resuming an interrupted round', () => {
        const conversation = conversationWith({
          lastRoundStatus: ConversationRoundStatus.awaitingPrompt,
          responses: {
            'declined-prompt': declinedResponse,
            'authorized-prompt': authorizedResponse,
          },
        });

        const result = getAgentPromptStorageState({
          input: { prompts: { 'other-prompt': { authorized: false } } },
          conversation,
        });

        expect(result.responses['declined-prompt']).toEqual(declinedResponse);
        expect(result.responses['authorized-prompt']).toEqual(authorizedResponse);
      });

      it('keeps carried-over confirmation responses when starting a new round', () => {
        const conversation = conversationWith({
          lastRoundStatus: ConversationRoundStatus.completed,
          responses: { 'conf-prompt': confirmationResponse },
        });

        const result = getAgentPromptStorageState({ input: { message: 'hello' }, conversation });

        expect(result.responses['conf-prompt']).toEqual(confirmationResponse);
      });

      it('does not drop an authorization response supplied via input.prompts on a new round', () => {
        const conversation = conversationWith({
          lastRoundStatus: ConversationRoundStatus.completed,
          responses: {},
        });

        const result = getAgentPromptStorageState({
          input: { prompts: { 'auth-prompt': { authorized: false } } },
          conversation,
        });

        expect(result.responses['auth-prompt']).toEqual(declinedResponse);
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
