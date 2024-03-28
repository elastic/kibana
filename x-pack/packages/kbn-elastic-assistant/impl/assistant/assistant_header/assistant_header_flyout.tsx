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
  EuiSwitch,
  EuiFormRow,
  EuiPopover,
  EuiContextMenu,
  EuiButtonIcon,
  EuiPanel,
  EuiConfirmModal,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
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
  showAnonymizedValues: boolean;
  title: string | JSX.Element;
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

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.ANONYMIZED_VALUES,
            panel: 2,
          },
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
      {
        id: 2,
        title: i18n.SHOW_ANONYMIZED,
        content: (
          <EuiPanel hasShadow={false}>
            <EuiFormRow label={i18n.SHOW_ANONYMIZED_TOOLTIP} hasChildLabel={false}>
              <EuiSwitch
                data-test-subj="showAnonymizedValues"
                checked={showAnonymizedValuesChecked}
                compressed={true}
                disabled={selectedConversation.replacements == null}
                label={i18n.SHOW_ANONYMIZED}
                onChange={onToggleShowAnonymizedValues}
              />
            </EuiFormRow>
          </EuiPanel>
        ),
      },
    ],

    [
      selectedConversation,
      onToggleShowAnonymizedValues,
      showAnonymizedValuesChecked,
      showDestroyModal,
    ]
  );

  const handleReset = useCallback(() => {
    onChatCleared();
    closeDestroyModal();
  }, [onChatCleared, closeDestroyModal]);

  return (
    <>
      <FlyoutNavigation isExpanded={chatHistoryVisible} setIsExpanded={setChatHistoryVisible}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="showAnonymizedValues"
              title={showAnonymizedValuesChecked ? 'Play' : 'Pause'}
              aria-label={showAnonymizedValuesChecked ? 'Play' : 'Pause'}
              iconType={showAnonymizedValuesChecked ? 'eye' : 'eyeClosed'}
              onClick={onToggleShowAnonymizedValues}
            />
          </EuiFlexItem>
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
              title={selectedConversation.id ?? title}
              selectedConversation={selectedConversation}
              onChange={onConversationSelected}
              isFlyoutMode={true}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <ConnectorSelectorInline
                  isDisabled={isDisabled || selectedConversation === undefined}
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={selectedConversation}
                  isFlyoutMode={true}
                  onConnectorSelected={onChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
