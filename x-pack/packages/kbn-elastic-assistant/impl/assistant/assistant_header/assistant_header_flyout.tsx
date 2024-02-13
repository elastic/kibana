/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiFormRow,
  EuiPopover,
  EuiContextMenu,
  EuiButtonIcon,
  EuiPanel,
  EuiSwitchEvent,
  EuiConfirmModal,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { Conversation, useAssistantContext } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { INLINE_CONNECTOR_PLACEHOLDER } from '../../connectorland/translations';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from '../translations';

interface OwnProps {
  currentConversation: Conversation;
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  docLinks: Omit<DocLinksStart, 'links'>;
  isDisabled: boolean;
  isSettingsModalVisible: boolean;
  onToggleShowAnonymizedValues: (e: EuiSwitchEvent) => void;
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
  const { http } = useAssistantContext();

  const { data: connectors } = useLoadConnectors({ http });

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

  const selectedConnectorName = useMemo(
    () =>
      connectors?.find((c) => c.id === selectedConnectorId)?.name ?? INLINE_CONNECTOR_PLACEHOLDER,
    [connectors, selectedConnectorId]
  );

  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const [isDestroyModalVisible, setIsDestroyModalVisible] = useState(false);

  const closeDestroyModal = () => setIsDestroyModalVisible(false);
  const showDestroyModal = () => setIsDestroyModalVisible(true);

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: 'Anonymized values',
            panel: 2,
          },
          {
            name: (
              <>
                {'Connector '}
                <strong>{selectedConnectorName}</strong>
              </>
            ),
            panel: 1,
          },
          {
            name: 'Reset conversation',
            css: css`
              color: ${euiThemeVars.euiColorDanger};
            `,
            onClick: showDestroyModal,
            icon: 'refresh',
          },
        ],
      },
      {
        id: 1,
        title: 'Connector',
        content: (
          <EuiPanel hasShadow={false}>
            <ConnectorSelectorInline
              isDisabled={isDisabled || currentConversation === undefined}
              selectedConnectorId={selectedConnectorId}
              selectedConversation={currentConversation}
              isFlyoutMode={true}
            />
          </EuiPanel>
        ),
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
      isDisabled,
      onToggleShowAnonymizedValues,
      selectedConnectorId,
      selectedConnectorName,
      showAnonymizedValuesChecked,
    ]
  );

  return (
    <>
      <FlyoutNavigation isExpanded={chatHistoryVisible} setIsExpanded={setChatHistoryVisible}>
        <EuiFlexGroup gutterSize="xs">
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
              <EuiButtonIcon iconType="cross" color="text" size="xs" onClick={onCloseFlyout} />
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
          <EuiFlexItem>
            <AssistantTitle
              docLinks={docLinks}
              title={currentConversation.id ?? title}
              selectedConversation={currentConversation}
              setSelectedConversationId={setSelectedConversationId}
              isFlyoutMode={true}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPopover
              button={<EuiButtonIcon iconType="boxesVertical" onClick={onButtonClick} />}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenu initialPanelId={0} panels={panels} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isDestroyModalVisible && (
        <EuiConfirmModal
          title="Reset conversation"
          onCancel={closeDestroyModal}
          onConfirm={() => {
            onChatCleared();
            closeDestroyModal();
          }}
          cancelButtonText="Cancel"
          confirmButtonText="Apply"
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{'Are you sure want to clear the current chat? All conversation data will be lost'}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
