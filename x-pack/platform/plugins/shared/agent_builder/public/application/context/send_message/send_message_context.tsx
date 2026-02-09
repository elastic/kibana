/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { useSendMessageMutation } from './use_send_message_mutation';
import { useResumeRoundMutation } from './use_resume_round_mutation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';

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
  regenerate: () => void;
  isRegenerating: boolean;
  connectorSelection: {
    selectedConnector: string | undefined;
    selectConnector: (connectorId: string) => void;
    defaultConnectorId?: string;
  };
}

const SendMessageContext = createContext<SendMessageState | null>(null);

export const SendMessageProvider = ({ children }: { children: React.ReactNode }) => {
  const connectorSelection = useConnectorSelection();

  const {
    sendMessage,
    isResponseLoading,
    pendingMessage,
    error,
    errorSteps,
    agentReasoning: sendAgentReasoning,
    retry,
    canCancel,
    cancel,
    cleanConversation,
    regenerate,
    isRegenerating,
  } = useSendMessageMutation({ connectorId: connectorSelection.selectedConnector });

  const {
    resumeRound,
    isResuming,
    agentReasoning: resumeAgentReasoning,
  } = useResumeRoundMutation({
    connectorId: connectorSelection.selectedConnector,
  });

  // Combine agentReasoning from mutations - use the one that's currently active
  const agentReasoning = isResuming ? resumeAgentReasoning : sendAgentReasoning;

  return (
    <SendMessageContext.Provider
      value={{
        sendMessage,
        isResponseLoading: isResponseLoading || isResuming || isRegenerating,
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
        regenerate,
        isRegenerating,
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
