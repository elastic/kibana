/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationStateManager, ToolStateManager } from '@kbn/agent-builder-server/runner';

export const createConversationStateManager = (
  conversation?: Conversation | undefined
): ConversationStateManager => {
  const toolCallStateMap = new Map<string, unknown>();

  // prefill tool state map with last round's tool state
  const lastRound = conversation ? conversation.rounds[conversation.rounds.length - 1] : undefined;
  if (lastRound && lastRound.state) {
    const nodeState = lastRound.state.agent.node;
    if (nodeState.step === 'execute_tool') {
      toolCallStateMap.set(nodeState.tool_call_id, nodeState.tool_state);
    }
  }

  return {
    getToolStateManager: ({ toolId, toolCallId }): ToolStateManager => {
      return {
        getState: <T = unknown>(): T | undefined => {
          if (toolCallId) {
            return toolCallStateMap.get(toolCallId) as T | undefined;
          }
          return undefined;
        },
        setState: <T = unknown>(state: T) => {
          if (toolCallId) {
            toolCallStateMap.set(toolCallId, state);
          }
        },
      };
    },
  };
};
