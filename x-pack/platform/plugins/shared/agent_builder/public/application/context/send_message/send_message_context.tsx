/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { useSendMessageMutation } from './use_send_message_mutation';
import { useResumeRoundMutation } from './use_resume_round_mutation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';

interface SendMessageState {
  sendMessage: ({ message }: { message: string }) => void;
  isResponseLoading: boolean;
  /** True while an externally-triggered round (ask_conversation) is awaiting the LLM. */
  isExternalRoundLoading: boolean;
  setExternalRoundLoading: (loading: boolean) => void;
  pendingMessage: string | undefined;
  error: unknown;
  errorSteps: ConversationRoundStep[];
  agentReasoning: string | null;
  retry: () => void;
  canCancel: boolean;
  cancel: () => void;
  cleanConversation: () => void;
  removeError: () => void;
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

export const SendMessageProvider = ({
  children,
  preferredConnectorId,
}: {
  children: React.ReactNode;
  preferredConnectorId?: string;
}) => {
  const [isExternalRoundLoading, setExternalRoundLoading] = useState(false);
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
    removeError,
    regenerate,
    isRegenerating,
    // Use the preferred connector if provided, otherwise fall back to global selection
  } = useSendMessageMutation({
    connectorId: preferredConnectorId ?? connectorSelection.selectedConnector,
  });

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
        isExternalRoundLoading,
        setExternalRoundLoading,
        pendingMessage,
        error,
        errorSteps,
        agentReasoning,
        retry,
        canCancel,
        cancel,
        cleanConversation,
        removeError,
        resumeRound,
        isResuming,
        regenerate,
        isRegenerating,
        connectorSelection: {
          // When this pane was spawned with a specific connector, show it in the selector
          // so the UI reflects which model is actually being used for this pane.
          selectedConnector: preferredConnectorId ?? connectorSelection.selectedConnector,
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
