/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationStateManager, ToolStateManager } from '@kbn/onechat-server/runner';

export const createConversationStateManager = (): ConversationStateManager => {
  const toolCallStateMap = new Map<string, unknown>();

  // TODO: prefill it when we figured out the state

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
