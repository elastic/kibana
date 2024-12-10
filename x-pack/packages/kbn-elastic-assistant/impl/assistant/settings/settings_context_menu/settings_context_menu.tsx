/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiNotificationBadge,
  EuiPopover,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KnowledgeBaseTour } from '../../../tour/knowledge_base';
import { AnonymizationSettingsManagement } from '../../../data_anonymization/settings/anonymization_settings_management';
import { useAssistantContext } from '../../../..';
import * as i18n from '../../assistant_header/translations';
import { AlertsSettingsModal } from '../alerts_settings/alerts_settings_modal';
import { KNOWLEDGE_BASE_TAB } from '../const';

interface Params {
  isDisabled?: boolean;
  onChatCleared?: () => void;
}

export const SettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false, onChatCleared }: Params) => {
    const { euiTheme } = useEuiTheme();
    const { navigateToApp, knowledgeBase } = useAssistantContext();

    const [isPopoverOpen, setPopover] = useState(false);

    const [isResetConversationModalVisible, setIsResetConversationModalVisible] = useState(false);

    const [isAlertsSettingsModalVisible, setIsAlertsSettingsModalVisible] = useState(false);
    const closeAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(false), []);
    const showAlertSettingsModal = useCallback(() => setIsAlertsSettingsModalVisible(true), []);

    const [isAnonymizationModalVisible, setIsAnonymizationModalVisible] = useState(false);
    const closeAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(false), []);
    const showAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(true), []);

    const closeDestroyModal = useCallback(() => setIsResetConversationModalVisible(false), []);

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);

    const showDestroyModal = useCallback(() => {
      closePopover?.();
      setIsResetConversationModalVisible(true);
    }, [closePopover]);

    const handleNavigateToSettings = useCallback(
      () =>
        navigateToApp('management', {
          path: 'kibana/securityAiAssistantManagement',
        }),
      [navigateToApp]
    );

    const handleNavigateToAnonymization = useCallback(() => {
      showAnonymizationModal();
      closePopover();
    }, [closePopover, showAnonymizationModal]);

    const handleNavigateToKnowledgeBase = useCallback(
      () =>
        navigateToApp('management', {
          path: `kibana/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
        }),
      [navigateToApp]
    );

    const handleShowAlertsModal = useCallback(() => {
      showAlertSettingsModal();
      closePopover();
    }, [closePopover, showAlertSettingsModal]);

    const items = useMemo(
      () => [
        <EuiContextMenuItem
          aria-label={'ai-assistant-settings'}
          key={'ai-assistant-settings'}
          onClick={handleNavigateToSettings}
          icon={'gear'}
          data-test-subj={'ai-assistant-settings'}
        >
          {i18n.AI_ASSISTANT_SETTINGS}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'knowledge-base'}
          key={'knowledge-base'}
          onClick={handleNavigateToKnowledgeBase}
          icon={'documents'}
          data-test-subj={'knowledge-base'}
        >
          {i18n.KNOWLEDGE_BASE}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'anonymization'}
          key={'anonymization'}
          onClick={handleNavigateToAnonymization}
          icon={'eye'}
          data-test-subj={'anonymization'}
        >
          {i18n.ANONYMIZATION}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'alerts-to-analyze'}
          key={'alerts-to-analyze'}
          onClick={handleShowAlertsModal}
          icon={'magnifyWithExclamation'}
          data-test-subj={'alerts-to-analyze'}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{i18n.ALERTS_TO_ANALYZE}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued">
                {knowledgeBase.latestAlerts}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'clear-chat'}
          key={'clear-chat'}
          onClick={showDestroyModal}
          icon={'refresh'}
          data-test-subj={'clear-chat'}
          css={css`
            color: ${euiTheme.colors.danger};
          `}
        >
          {i18n.RESET_CONVERSATION}
        </EuiContextMenuItem>,
      ],

      [
        euiTheme.colors.danger,
        handleNavigateToAnonymization,
        handleNavigateToKnowledgeBase,
        handleNavigateToSettings,
        handleShowAlertsModal,
        knowledgeBase.latestAlerts,
        showDestroyModal,
      ]
    );

    const handleReset = useCallback(() => {
      onChatCleared?.();
      closeDestroyModal();
      closePopover?.();
    }, [onChatCleared, closeDestroyModal, closePopover]);

    return (
      <>
        <EuiPopover
          button={
            <KnowledgeBaseTour>
              <EuiButtonIcon
                aria-label="test"
                isDisabled={isDisabled}
                iconType="boxesVertical"
                onClick={onButtonClick}
                data-test-subj="chat-context-menu"
              />
            </KnowledgeBaseTour>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="leftUp"
        >
          <EuiContextMenuPanel
            items={items}
            css={css`
              width: 250px;
            `}
          />
        </EuiPopover>
        {isAlertsSettingsModalVisible && <AlertsSettingsModal onClose={closeAlertSettingsModal} />}
        {isAnonymizationModalVisible && (
          <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
        )}
        {isResetConversationModalVisible && (
          <EuiConfirmModal
            title={i18n.RESET_CONVERSATION}
            onCancel={closeDestroyModal}
            onConfirm={handleReset}
            cancelButtonText={i18n.CANCEL_BUTTON_TEXT}
            confirmButtonText={i18n.RESET_BUTTON_TEXT}
            buttonColor="danger"
            defaultFocusedButton="confirm"
            data-test-subj="reset-conversation-modal"
          >
            <p>{i18n.CLEAR_CHAT_CONFIRMATION}</p>
          </EuiConfirmModal>
        )}
      </>
    );
  }
);

SettingsContextMenu.displayName = 'SettingsContextMenu';
