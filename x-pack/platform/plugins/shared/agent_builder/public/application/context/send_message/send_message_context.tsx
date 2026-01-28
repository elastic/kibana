/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { useQueryClient } from '@kbn/react-query';
import { useSendMessageMutation } from './use_send_message_mutation';
import { useResumeRoundMutation } from './use_resume_round_mutation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { useAgentId } from '../../hooks/use_conversation';
import { useConversationId } from '../conversation/use_conversation_id';
import { queryKeys } from '../../query_keys';
import { newConversationId } from '../../utils/new_conversation';

interface SendMessageState {
  sendMessage: ({ message }: { message: string }) => void;
  isResponseLoading: boolean;
  pendingMessage: string | undefined;
  error: unknown;
  errorSteps: ConversationRoundStep[];
  agentReasoning: string | null;
  retry: () => void;
  canCancel: boolean;
  cancel: () => void;
  cleanConversation: () => void;
  resumeRound: (opts: { promptId: string; confirm: boolean }) => void;
  isResuming: boolean;
  connectorSelection: {
    selectedConnector: string | undefined;
    selectConnector: (connectorId: string) => void;
    defaultConnectorId?: string;
  };
}

const SendMessageContext = createContext<SendMessageState | null>(null);

interface SendMessageProviderProps {
  children: React.ReactNode;
  onMessageSubmit?: (
    message: string,
    context: {
      agentId?: string;
      connectorId?: string;
    }
  ) => void;
}

export const SendMessageProvider = ({ children, onMessageSubmit }: SendMessageProviderProps) => {
  const connectorSelection = useConnectorSelection();
  const agentId = useAgentId(); // Get current selected agent ID
  const queryClient = useQueryClient();
  const conversationId = useConversationId();

  const {
    sendMessage: originalSendMessage,
    isResponseLoading,
    pendingMessage,
    error,
    errorSteps,
    agentReasoning: sendAgentReasoning,
    retry,
    canCancel,
    cancel,
    cleanConversation,
  } = useSendMessageMutation({ connectorId: connectorSelection.selectedConnector });

  const {
    resumeRound,
    isResuming,
    agentReasoning: resumeAgentReasoning,
  } = useResumeRoundMutation({
    connectorId: connectorSelection.selectedConnector,
  });

  // Combine agentReasoning from both mutations - use the one that's currently active
  const agentReasoning = isResuming ? resumeAgentReasoning : sendAgentReasoning;

  // Override sendMessage if onMessageSubmit is provided (for input-only mode)
  const sendMessage = useCallback(
    ({ message }: { message: string }) => {
      if (onMessageSubmit) {
        const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
        const conversation = queryClient.getQueryData<Conversation>(queryKey);
        const currentAgentId = conversation?.agent_id || agentId;

        onMessageSubmit(message, {
          agentId: currentAgentId,
          connectorId: connectorSelection.selectedConnector,
        });
      } else {
        originalSendMessage({ message });
      }
    },
    [
      onMessageSubmit,
      queryClient,
      conversationId,
      agentId,
      connectorSelection.selectedConnector,
      originalSendMessage,
    ]
  );

  return (
    <SendMessageContext.Provider
      value={{
        sendMessage,
        isResponseLoading: isResponseLoading || isResuming,
        pendingMessage,
        error,
        errorSteps,
        agentReasoning,
        retry,
        canCancel,
        cancel,
        cleanConversation,
        resumeRound,
        isResuming,
        connectorSelection: {
          selectedConnector: connectorSelection.selectedConnector,
          selectConnector: connectorSelection.selectConnector,
          defaultConnectorId: connectorSelection.defaultConnectorId,
        },
      }}
    >
      {children}
    </SendMessageContext.Provider>
  );
};

export const useSendMessage = () => {
  const context = useContext(SendMessageContext);
  if (!context) {
    throw new Error('useSendMessage must be used within a SendMessageProvider');
  }
  return context;
};
