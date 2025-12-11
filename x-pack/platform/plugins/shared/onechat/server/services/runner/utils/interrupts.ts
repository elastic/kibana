/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, RawRoundInput } from '@kbn/onechat-common';
import type { PromptManager, ToolPromptManager } from '@kbn/onechat-server/runner';
import type { ToolConfirmationPromptWithResponse } from '@kbn/onechat-server/agents/prompts';
import type { ToolConfirmationPrompt } from '@kbn/onechat-common/agents/prompts';
import { AgentPromptSource, AgentPromptType } from '@kbn/onechat-common/agents/prompts';

export const createInterruptManager = (): PromptManager => {
  const promptMap = new Map<string, ToolConfirmationPromptWithResponse>();

  return {
    set: (toolCallId, interrupt) => {
      promptMap.set(toolCallId, interrupt);
    },
    clear: () => {
      promptMap.clear();
    },
    forTool: ({ toolId, toolCallId }): ToolPromptManager => {
      return {
        getCurrentPrompt: () => {
          return toolCallId ? promptMap.get(toolCallId) : undefined;
        },
        confirm: ({ state, ...confirm }) => {
          const prompt: ToolConfirmationPrompt = {
            type: AgentPromptType.confirmation,
            source: AgentPromptSource.tool,
            data: {
              toolId,
              toolCallId: toolCallId ?? 'unknown',
            },
            confirm,
            state: state ?? {},
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
  input: RawRoundInput;
  conversation?: Conversation;
}) => {
  if (conversation?.rounds.length) {
    const lastRound = conversation.rounds[conversation.rounds.length - 1];
    const interrupt = lastRound.pending_prompt;
    // TODO: actually populate
  }
};
