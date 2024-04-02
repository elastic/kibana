/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenu,
  EuiButtonIcon,
  EuiPanel,
  EuiConfirmModal,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { isEmpty } from 'lodash';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from './translations';
import { AIConnector } from '../../connectorland/connector_selector';

interface OwnProps {
  selectedConversation: Conversation;
  defaultConnector?: AIConnector;
  docLinks: Omit<DocLinksStart, 'links'>;
  isDisabled: boolean;
  isSettingsModalVisible: boolean;
  onToggleShowAnonymizedValues: () => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation>>;
  showAnonymizedValues: boolean;
  title: string;
  onChatCleared: () => void;
  onCloseFlyout?: () => void;
  chatHistoryVisible: boolean;
  setChatHistoryVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  conversations: Record<string, Conversation>;
  refetchConversationsState: () => Promise<void>;
}

type Props = OwnProps;
/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeaderFlyout: React.FC<Props> = ({
  selectedConversation,
  defaultConnector,
  docLinks,
  isDisabled,
  isSettingsModalVisible,
  onToggleShowAnonymizedValues,
  setIsSettingsModalVisible,
  setCurrentConversation,
  showAnonymizedValues,
  title,
  onChatCleared,
  chatHistoryVisible,
  setChatHistoryVisible,
  onCloseFlyout,
  onConversationSelected,
  conversations,
  refetchConversationsState,
}) => {
  const showAnonymizedValuesChecked = useMemo(
    () =>
      selectedConversation.replacements != null &&
      Object.keys(selectedConversation.replacements).length > 0 &&
      showAnonymizedValues,
    [selectedConversation.replacements, showAnonymizedValues]
  );

  const selectedConnectorId = useMemo(
    () => selectedConversation?.apiConfig?.connectorId,
    [selectedConversation?.apiConfig?.connectorId]
  );

  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const [isResetConversationModalVisible, setIsResetConversationModalVisible] = useState(false);

  const closeDestroyModal = useCallback(() => setIsResetConversationModalVisible(false), []);
  const showDestroyModal = useCallback(() => setIsResetConversationModalVisible(true), []);

  const onConversationChange = useCallback(
    (updatedConversation) => {
      setCurrentConversation(updatedConversation);
      onConversationSelected({
        cId: updatedConversation.id,
        cTitle: updatedConversation.title,
      });
    },
    [onConversationSelected, setCurrentConversation]
  );

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.RESET_CONVERSATION,
            css: css`
              color: ${euiThemeVars.euiColorDanger};
            `,
            onClick: showDestroyModal,
            icon: 'refresh',
          },
        ],
      },
    ],
    [showDestroyModal]
  );

  const handleReset = useCallback(() => {
    onChatCleared();
    closeDestroyModal();
  }, [onChatCleared, closeDestroyModal]);

  return (
    <>
      <FlyoutNavigation isExpanded={chatHistoryVisible} setIsExpanded={setChatHistoryVisible}>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <AssistantSettingsButton
              defaultConnector={defaultConnector}
              isDisabled={isDisabled}
              isSettingsModalVisible={isSettingsModalVisible}
              selectedConversation={selectedConversation}
              setIsSettingsModalVisible={setIsSettingsModalVisible}
              onConversationSelected={onConversationSelected}
              conversations={conversations}
              refetchConversationsState={refetchConversationsState}
              isFlyoutMode={true}
            />
          </EuiFlexItem>

          {onCloseFlyout && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label="xxx"
                iconType="cross"
                color="text"
                size="xs"
                onClick={onCloseFlyout}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </FlyoutNavigation>
      <EuiPanel
        hasShadow={false}
        paddingSize="m"
        css={css`
          padding-top: ${euiThemeVars.euiSizeS};
          padding-bottom: ${euiThemeVars.euiSizeS};
        `}
      >
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'} gutterSize="s">
          <EuiFlexItem
            css={css`
              overflow: hidden;
            `}
          >
            <AssistantTitle
              docLinks={docLinks}
              title={title}
              selectedConversation={selectedConversation}
              onChange={onConversationChange}
              isFlyoutMode={true}
              refetchConversationsState={refetchConversationsState}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems={'center'}>
              <EuiFlexItem>
                <ConnectorSelectorInline
                  isDisabled={isDisabled || selectedConversation === undefined}
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={selectedConversation}
                  isFlyoutMode={true}
                  onConnectorSelected={onConversationChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    showAnonymizedValuesChecked ? i18n.SHOW_REAL_VALUES : i18n.SHOW_ANONYMIZED
                  }
                >
                  <EuiButtonIcon
                    css={css`
                      border-radius: 50%;
                    `}
                    display="base"
                    data-test-subj="showAnonymizedValues"
                    isSelected={showAnonymizedValuesChecked}
                    aria-label={
                      showAnonymizedValuesChecked ? i18n.SHOW_ANONYMIZED : i18n.SHOW_REAL_VALUES
                    }
                    iconType={showAnonymizedValuesChecked ? 'eye' : 'eyeClosed'}
                    onClick={onToggleShowAnonymizedValues}
                    isDisabled={isEmpty(selectedConversation.replacements)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      aria-label="test"
                      iconType="boxesVertical"
                      onClick={onButtonClick}
                    />
                  }
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenu initialPanelId={0} panels={panels} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isResetConversationModalVisible && (
        <EuiConfirmModal
          title={i18n.RESET_CONVERSATION_TITLE}
          onCancel={closeDestroyModal}
          onConfirm={handleReset}
          cancelButtonText={i18n.CANCEL_BUTTON_TEXT}
          confirmButtonText={i18n.RESET_BUTTON_TEXT}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{i18n.CLEAR_CHAT_CONFIRMATION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
