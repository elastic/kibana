/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { Conversation } from '../../..';
import { AssistantSettings } from './assistant_settings';
import * as i18n from './translations';

interface Props {
  selectedConversation: Conversation;
  showSettingsModal?: (isVisible: boolean) => void;
}

/**
 * Gear button that opens the assistant settings modal
 */
export const AssistantSettingsButton: React.FC<Props> = React.memo(
  ({ selectedConversation, showSettingsModal }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    // Modal control functions
    const cleanupAndCloseModal = useCallback(() => {
      setIsModalVisible(false);
    }, [setIsModalVisible]);

    const handleCloseModal = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

    const handleSave = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

    return (
      <>
        <EuiToolTip position="right" content={i18n.SETTINGS_TOOLTIP}>
          <EuiButtonIcon
            aria-label={i18n.SETTINGS}
            data-test-subj="settings"
            onClick={() => setIsModalVisible(true)}
            iconType="gear"
            size="xs"
          />
        </EuiToolTip>

        {isModalVisible && (
          <AssistantSettings
            selectedConversation={selectedConversation}
            onClose={handleCloseModal}
            onSave={handleSave}
          />
        )}
      </>
    );
  }
);

AssistantSettingsButton.displayName = 'AssistantSettingsButton';
