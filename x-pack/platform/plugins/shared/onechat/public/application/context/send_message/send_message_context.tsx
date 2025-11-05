/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { useSendMessageMutation } from './use_send_message_mutation';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';

interface SendMessageState {
  sendMessage: ({ message }: { message: string }) => void;
  isResponseLoading: boolean;
  error: unknown;
  pendingMessage: string | undefined;
  agentReasoning: string | null;
  retry: () => void;
  canCancel: boolean;
  cancel: () => void;
  cleanConversation: () => void;
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
    error,
    pendingMessage,
    agentReasoning,
    retry,
    canCancel,
    cancel,
    cleanConversation,
  } = useSendMessageMutation({ connectorId: connectorSelection.selectedConnector });

  return (
    <SendMessageContext.Provider
      value={{
        sendMessage,
        isResponseLoading,
        error,
        pendingMessage,
        agentReasoning,
        retry,
        canCancel,
        cancel,
        cleanConversation,
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
