/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';
import { DataStreamApis } from '../use_data_stream_apis';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation } from '../../..';
import { AssistantSettings } from './assistant_settings';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';

interface Props {
  defaultConnector?: AIConnector;
  isSettingsModalVisible: boolean;
  selectedConversationId?: string;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  isDisabled?: boolean;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  refetchPrompts?: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

/**
 * Assistant settings modal
 */
export const AssistantSettingsModal: React.FC<Props> = React.memo(
  ({
    defaultConnector,
    isSettingsModalVisible,
    setIsSettingsModalVisible,
    onConversationSelected,
    conversations,
    conversationsLoaded,
    refetchCurrentConversation,
    refetchCurrentUserConversations,
    refetchPrompts,
    setPaginationObserver,
  }) => {
    const { toasts } = useAssistantContext();

    // Modal control functions
    const cleanupAndCloseModal = useCallback(() => {
      setIsSettingsModalVisible(false);
    }, [setIsSettingsModalVisible]);

    const handleCloseModal = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

    const handleSave = useCallback(
      async (success: boolean) => {
        cleanupAndCloseModal();
        await refetchCurrentConversation({ isStreamRefetch: false });
        await refetchCurrentUserConversations();
        if (refetchPrompts) {
          await refetchPrompts();
        }
        if (success) {
          toasts?.addSuccess({
            iconType: 'check',
            title: i18n.SETTINGS_UPDATED_TOAST_TITLE,
          });
        }
      },
      [
        cleanupAndCloseModal,
        refetchCurrentConversation,
        refetchCurrentUserConversations,
        refetchPrompts,
        toasts,
      ]
    );

    return (
      isSettingsModalVisible && (
        <AssistantSettings
          defaultConnector={defaultConnector}
          onConversationSelected={onConversationSelected}
          onClose={handleCloseModal}
          onSave={handleSave}
          conversations={conversations}
          conversationsLoaded={conversationsLoaded}
          setPaginationObserver={setPaginationObserver}
        />
      )
    );
  }
);

AssistantSettingsModal.displayName = 'AssistantSettingsModal';
