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
  ConfirmationInfo,
} from '@kbn/agent-builder-server/runner';
import type {
  ConfirmationPrompt,
  ConfirmPromptDefinition,
  PromptResponseState,
} from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import { i18nBundles } from '../i18n';

export const createPromptManager = (): PromptManager => {
  const promptMap = new Map<string, PromptResponseState>();

  const checkConfirmationStatus = (promptId: string): ConfirmationInfo => {
    const prompt = promptMap.get(promptId);
    if (!prompt) {
      return { status: ConfirmationStatus.unprompted };
    }
    if (prompt.type === AgentPromptType.confirmation) {
      return {
        status: prompt.response.confirmed
          ? ConfirmationStatus.accepted
          : ConfirmationStatus.rejected,
      };
    }
    throw new Error('Trying to check confirmation status of non-confirmation prompt.');
  };

  const getConfirmationPrompt = (confirm: ConfirmPromptDefinition): ConfirmationPrompt => {
    return {
      type: AgentPromptType.confirmation,
      ...confirm,
    };
  };

  return {
    set: (promptId, interrupt) => {
      promptMap.set(promptId, interrupt);
    },
    get: (promptId) => {
      return promptMap.get(promptId);
    },
    getConfirmationStatus: (promptId) => {
      return checkConfirmationStatus(promptId);
    },
    clear: () => {
      promptMap.clear();
    },
    forTool: ({ toolId, toolCallId, toolParams }): ToolPromptManager => {
      return {
        checkConfirmationStatus,
        askForConfirmation: (confirm) => {
          return { prompt: getConfirmationPrompt(confirm) };
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
      promptManager.set(interrupt.id, {
        ...interrupt,
        response: { confirmed },
      });
    }
  }
};

export const toolConfirmationId = (toolId: string): string => `${toolId}.confirm`;

export const createToolConfirmationPrompt = ({
  tool,
}: {
  tool: InternalToolDefinition;
}): ConfirmationPrompt => {
  return {
    type: AgentPromptType.confirmation,
    id: toolConfirmationId(tool.id),
    title: i18nBundles.toolConfirmation.title,
    message: i18nBundles.toolConfirmation.message(tool.id),
    confirm_text: i18nBundles.toolConfirmation.confirmText,
    cancel_text: i18nBundles.toolConfirmation.cancelText,
  };
};
