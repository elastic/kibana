/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';
import { DataStreamApis } from '../use_data_stream_apis';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation } from '../../..';
import { AssistantSettings } from './assistant_settings';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { CONVERSATIONS_TAB } from './const';

interface Props {
  defaultConnector?: AIConnector;
  isSettingsModalVisible: boolean;
  selectedConversationId?: string;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  isDisabled?: boolean;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  refetchPrompts?: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
}

/**
 * Gear button that opens the assistant settings modal
 */
export const AssistantSettingsButton: React.FC<Props> = React.memo(
  ({
    defaultConnector,
    isDisabled = false,
    isSettingsModalVisible,
    setIsSettingsModalVisible,
    selectedConversationId,
    onConversationSelected,
    conversations,
    conversationsLoaded,
    refetchCurrentUserConversations,
    refetchPrompts,
  }) => {
    const { toasts, setSelectedSettingsTab } = useAssistantContext();

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
      [cleanupAndCloseModal, refetchCurrentUserConversations, refetchPrompts, toasts]
    );

    const handleShowConversationSettings = useCallback(() => {
      setSelectedSettingsTab(CONVERSATIONS_TAB);
      setIsSettingsModalVisible(true);
    }, [setIsSettingsModalVisible, setSelectedSettingsTab]);

    return (
      <>
        <EuiToolTip position="right" content={i18n.SETTINGS_TOOLTIP}>
          <EuiButtonIcon
            aria-label={i18n.SETTINGS}
            data-test-subj="settings"
            onClick={handleShowConversationSettings}
            isDisabled={isDisabled}
            iconType="gear"
            size="xs"
            color="text"
          />
        </EuiToolTip>

        {isSettingsModalVisible && (
          <AssistantSettings
            defaultConnector={defaultConnector}
            selectedConversationId={selectedConversationId}
            onConversationSelected={onConversationSelected}
            onClose={handleCloseModal}
            onSave={handleSave}
            conversations={conversations}
            conversationsLoaded={conversationsLoaded}
          />
        )}
      </>
    );
  }
);

AssistantSettingsButton.displayName = 'AssistantSettingsButton';
