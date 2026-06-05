/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type {
  PromptManager,
  ToolPromptManager,
  ConfirmationInfo,
  AuthorizationInfo,
} from '@kbn/agent-builder-server/runner';
import type {
  AuthorizationPrompt,
  AuthorizationPromptDefinition,
  ConfirmationPrompt,
  ConfirmPromptDefinition,
  PromptResponseState,
  PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import {
  AgentPromptType,
  AuthorizationStatus,
  ConfirmationStatus,
  isAuthorizationPromptResponse,
  isConfirmationPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import type { ToolConfirmationPolicyMode } from '@kbn/agent-builder-server/tools';
import type { ToolPolicyConfirmationDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { i18nBundles } from '../i18n';

export const createPromptManager = ({
  state,
}: { state?: PromptStorageState } = {}): PromptManager => {
  const promptMap = new Map<string, PromptResponseState>();

  // pre-fill the prompt map based on the current state
  if (state) {
    for (const [promptId, response] of Object.entries(state.responses)) {
      promptMap.set(promptId, response);
    }
  }

  const dump = (): PromptStorageState => {
    return {
      responses: Object.fromEntries(promptMap.entries()),
    };
  };

  const checkConfirmationStatus = (promptId: string): ConfirmationInfo => {
    const prompt = promptMap.get(promptId);
    if (!prompt) {
      return { status: ConfirmationStatus.unprompted };
    }
    if (prompt.type === AgentPromptType.confirmation) {
      return {
        status: prompt.response.allow ? ConfirmationStatus.accepted : ConfirmationStatus.rejected,
      };
    }
    throw new Error('Trying to check confirmation status of non-confirmation prompt.');
  };

  const checkAuthorizationStatus = (promptId: string): AuthorizationInfo => {
    const prompt = promptMap.get(promptId);
    if (!prompt) {
      return { status: AuthorizationStatus.unprompted };
    }
    if (prompt.type === AgentPromptType.authorization) {
      return {
        status: prompt.response.authorized
          ? AuthorizationStatus.authorized
          : AuthorizationStatus.declined,
      };
    }
    throw new Error('Trying to check authorization status of non-authorization prompt.');
  };

  const getConfirmationPrompt = (confirm: ConfirmPromptDefinition): ConfirmationPrompt => {
    return {
      type: AgentPromptType.confirmation,
      ...confirm,
    };
  };

  const getAuthorizationPrompt = (auth: AuthorizationPromptDefinition): AuthorizationPrompt => {
    return {
      type: AgentPromptType.authorization,
      ...auth,
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
    getAuthorizationStatus: (promptId) => {
      return checkAuthorizationStatus(promptId);
    },
    clear: () => {
      promptMap.clear();
    },
    dump,
    forTool: ({ toolId, toolCallId, toolParams }): ToolPromptManager => {
      return {
        checkConfirmationStatus,
        checkAuthorizationStatus,
        askForConfirmation: (confirm) => {
          return { prompt: getConfirmationPrompt(confirm) };
        },
        askForAuthorization: (auth) => {
          return { prompt: getAuthorizationPrompt(auth) };
        },
      };
    },
  };
};

export const getAgentPromptStorageState = ({
  input,
  conversation,
}: {
  input: ConverseInput;
  conversation?: Conversation;
}): PromptStorageState => {
  const rounds = conversation?.rounds ?? [];
  const lastRound = rounds[rounds.length - 1];
  const isResumingRound = lastRound?.status === ConversationRoundStatus.awaitingPrompt;

  // Create a shallow copy to avoid mutating the original conversation state
  const responses = { ...(conversation?.state?.prompt?.responses ?? {}) };

  // Scope authorization responses to the conversation round (subsequent rounds can re-prompt)
  if (!isResumingRound) {
    Object.entries(responses).forEach(([promptId, { response }]) => {
      if (isAuthorizationPromptResponse(response)) {
        delete responses[promptId];
      }
    });
  }

  const state: PromptStorageState = { responses };

  if (input.prompts) {
    Object.entries(input.prompts).forEach(([promptId, response]) => {
      if (isConfirmationPromptResponse(response)) {
        state.responses[promptId] = {
          type: AgentPromptType.confirmation,
          response,
        };
      } else if (isAuthorizationPromptResponse(response)) {
        state.responses[promptId] = {
          type: AgentPromptType.authorization,
          response,
        };
      }
    });
  }

  return state;
};

export const toolConfirmationId = ({
  toolId,
  toolCallId,
  policyMode,
}: {
  toolId: string;
  toolCallId: string;
  policyMode?: ToolConfirmationPolicyMode;
}): string => {
  let confirmationId = `tools.${toolId}.confirmation`;
  if (policyMode === 'always') {
    confirmationId += `.${toolCallId}`;
  }
  return confirmationId;
};

export const createToolConfirmationPrompt = ({
  confirmationId,
  tool,
  definition,
}: {
  confirmationId: string;
  tool: InternalToolDefinition;
  definition?: ToolPolicyConfirmationDefinition;
}): ConfirmationPrompt => {
  if (definition) {
    return {
      type: AgentPromptType.confirmation,
      id: confirmationId,
      ...definition,
    };
  } else {
    return {
      type: AgentPromptType.confirmation,
      id: confirmationId,
      title: i18nBundles.toolConfirmation.title,
      message: i18nBundles.toolConfirmation.message(tool.id),
      confirm_text: i18nBundles.toolConfirmation.confirmText,
      cancel_text: i18nBundles.toolConfirmation.cancelText,
    };
  }
};
