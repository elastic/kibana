/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import type {
  PromptManager,
  ToolPromptManager,
  PromptManagerInitialState,
} from '@kbn/agent-builder-server/runner';
import type { PromptResponse, PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';

export const createPromptManager = (state?: PromptManagerInitialState): PromptManager => {
  const promptMap = new Map<string, PromptResponse>();

  if (state) {
    for (const [promptId, response] of Object.entries(state.promptMap)) {
      promptMap.set(promptId, response);
    }
  }

  return {
    set: (promptId, response) => {
      promptMap.set(promptId, response);
    },
    clear: () => {
      promptMap.clear();
    },
    forTool: ({ toolId, toolCallId, toolParams }): ToolPromptManager => {
      return {
        checkConfirmationStatus: (promptId) => {
          const prompt = promptMap.get(promptId);
          if (!prompt) {
            return { status: ConfirmationStatus.unprompted };
          }
          return {
            status: prompt.confirmed ? ConfirmationStatus.accepted : ConfirmationStatus.rejected,
          };
        },
        askForConfirmation: (confirm) => {
          const prompt: PromptRequest = {
            type: AgentPromptType.confirmation,
            ...confirm,
          };
          return { prompt };
        },
      };
    },
  };
};

export const initPromptManager = ({
  promptManager,
  input,
  conversation,
}: {
  promptManager: PromptManager;
  input: ConverseInput;
  conversation?: Conversation;
}) => {
  if (conversation?.rounds.length) {
    const lastRound = conversation.rounds[conversation.rounds.length - 1];
    const interrupt = lastRound.pending_prompt;
    const confirmed = (input.prompt_response?.confirmed as boolean) ?? false;
    if (interrupt) {
      promptManager.set(interrupt.id, { type: AgentPromptType.confirmation, confirmed });
    }
  }
};
