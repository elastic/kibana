/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiNotificationBadge,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { useAssistantContext } from '../../../..';
import * as i18n from '../../assistant_header/translations';

interface Params {
  isDisabled?: boolean;
  onChatCleared?: () => void;
}

export const SettingsContextMenu: React.FC<Params> = React.memo(
  ({ isDisabled = false, onChatCleared }: Params) => {
    const {
      navigateToApp,
      knowledgeBase,
      assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    } = useAssistantContext();

    const [isPopoverOpen, setPopover] = useState(false);

    const [isResetConversationModalVisible, setIsResetConversationModalVisible] = useState(false);
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

    const handleNavigateToKnowledgeBase = useCallback(
      () =>
        navigateToApp('management', {
          path: 'kibana/securityAiAssistantManagement',
        }),
      [navigateToApp]
    );

    // We are migrating away from the settings modal in favor of the new Stack Management UI
    // Currently behind `assistantKnowledgeBaseByDefault` FF
    const newItems: ReactElement[] = useMemo(
      () => [
        <EuiContextMenuItem
          aria-label={'ai-assistant-settings'}
          onClick={handleNavigateToSettings}
          icon={'gear'}
          data-test-subj={'ai-assistant-settings'}
        >
          {i18n.AI_ASSISTANT_SETTINGS}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'anonymization'}
          onClick={handleNavigateToSettings}
          icon={'eye'}
          data-test-subj={'anonymization'}
        >
          {i18n.ANONYMIZATION}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'knowledge-base'}
          onClick={handleNavigateToKnowledgeBase}
          icon={'documents'}
          data-test-subj={'knowledge-base'}
        >
          {i18n.KNOWLEDGE_BASE}
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          aria-label={'alerts-to-analyze'}
          onClick={handleNavigateToSettings}
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
      ],
      [handleNavigateToKnowledgeBase, handleNavigateToSettings, knowledgeBase]
    );

    const items = useMemo(
      () => [
        ...(enableKnowledgeBaseByDefault ? newItems : []),
        <EuiContextMenuItem
          aria-label={'clear-chat'}
          onClick={showDestroyModal}
          icon={'refresh'}
          data-test-subj={'clear-chat'}
          css={css`
            color: ${euiThemeVars.euiColorDanger};
          `}
        >
          {i18n.RESET_CONVERSATION}
        </EuiContextMenuItem>,
      ],

      [enableKnowledgeBaseByDefault, newItems, showDestroyModal]
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
            <EuiButtonIcon
              aria-label="test"
              isDisabled={isDisabled}
              iconType="boxesVertical"
              onClick={onButtonClick}
              data-test-subj="chat-context-menu"
            />
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
