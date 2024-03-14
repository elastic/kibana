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
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from './translations';

interface OwnProps {
  currentConversation: Conversation;
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  docLinks: Omit<DocLinksStart, 'links'>;
  isDisabled: boolean;
  isSettingsModalVisible: boolean;
  onToggleShowAnonymizedValues: () => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
  showAnonymizedValues: boolean;
  title: string | JSX.Element;
  onChatCleared: () => void;
  onCloseFlyout?: () => void;
  chatHistoryVisible: boolean;
  setChatHistoryVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

type Props = OwnProps;
/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeaderFlyout: React.FC<Props> = ({
  currentConversation,
  defaultConnectorId,
  defaultProvider,
  docLinks,
  isDisabled,
  isSettingsModalVisible,
  onToggleShowAnonymizedValues,
  setIsSettingsModalVisible,
  setSelectedConversationId,
  showAnonymizedValues,
  title,
  onChatCleared,
  chatHistoryVisible,
  setChatHistoryVisible,
  onCloseFlyout,
}) => {
  const showAnonymizedValuesChecked = useMemo(
    () =>
      currentConversation.replacements != null &&
      Object.keys(currentConversation.replacements).length > 0 &&
      showAnonymizedValues,
    [currentConversation.replacements, showAnonymizedValues]
  );

  const selectedConnectorId = useMemo(
    () => currentConversation?.apiConfig?.connectorId,
    [currentConversation?.apiConfig?.connectorId]
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
                disabled={currentConversation.replacements == null}
                label={i18n.SHOW_ANONYMIZED}
                onChange={onToggleShowAnonymizedValues}
              />
            </EuiFormRow>
          </EuiPanel>
        ),
      },
    ],

    [
      currentConversation,
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
              defaultConnectorId={defaultConnectorId}
              defaultProvider={defaultProvider}
              isDisabled={isDisabled}
              isSettingsModalVisible={isSettingsModalVisible}
              selectedConversation={currentConversation}
              setIsSettingsModalVisible={setIsSettingsModalVisible}
              setSelectedConversationId={setSelectedConversationId}
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
              title={currentConversation.id ?? title}
              selectedConversation={currentConversation}
              setSelectedConversationId={setSelectedConversationId}
              isFlyoutMode={true}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <ConnectorSelectorInline
                  isDisabled={isDisabled || currentConversation === undefined}
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={currentConversation}
                  isFlyoutMode={true}
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
