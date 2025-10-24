/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { ReasoningStep, ToolCallProgress, ToolCallStep } from '@kbn/onechat-common';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';

interface ConversationContextValue {
  conversationId?: string;
  shouldStickToBottom?: boolean;

  // Conversation actions (moved from useConversationActions)
  removeNewConversationQuery: () => void;
  invalidateConversation: () => void;
  addOptimisticRound: ({ userMessage }: { userMessage: string }) => void;
  removeOptimisticRound: () => void;
  setAgentId: (agentId: string) => void;
  addReasoningStep: ({ step }: { step: ReasoningStep }) => void;
  addToolCall: ({ step }: { step: ToolCallStep }) => void;
  setToolCallProgress: ({
    progress,
    toolCallId,
  }: {
    progress: ToolCallProgress;
    toolCallId: string;
  }) => void;
  setToolCallResult: ({
    results,
    toolCallId,
  }: {
    results: ToolResult[];
    toolCallId: string;
  }) => void;
  setAssistantMessage: ({ assistantMessage }: { assistantMessage: string }) => void;
  addAssistantMessageChunk: ({ messageChunk }: { messageChunk: string }) => void;
  onConversationCreated: ({
    conversationId,
    title,
  }: {
    conversationId: string;
    title: string;
  }) => void;
  deleteConversation: (id: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationContext.Provider');
  }
  return context;
};

export { ConversationContext };
