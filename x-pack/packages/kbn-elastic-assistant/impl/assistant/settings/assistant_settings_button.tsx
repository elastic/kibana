/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { Conversation } from '../../..';
import { AssistantSettings, CONVERSATIONS_TAB } from './assistant_settings';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';

interface Props {
  selectedConversation: Conversation;
  isDisabled?: boolean;
}

/**
 * Gear button that opens the assistant settings modal
 */
export const AssistantSettingsButton: React.FC<Props> = React.memo(
  ({ isDisabled = false, selectedConversation }) => {
    const {
      isSettingsModalVisible,
      selectedSettingsTab,
      setIsSettingsModalVisible,
      setSelectedSettingsTab,
    } = useAssistantContext();

    // Modal control functions
    const cleanupAndCloseModal = useCallback(() => {
      setIsSettingsModalVisible(false);
    }, [setIsSettingsModalVisible]);

    const handleCloseModal = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

    const handleSave = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

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
          />
        </EuiToolTip>

        {isSettingsModalVisible && (
          <AssistantSettings
            selectedConversation={selectedConversation}
            selectedTab={selectedSettingsTab}
            onClose={handleCloseModal}
            onSave={handleSave}
          />
        )}
      </>
    );
  }
);

AssistantSettingsButton.displayName = 'AssistantSettingsButton';
