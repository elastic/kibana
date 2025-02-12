/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPanel,
  EuiSkeletonTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { DataStreamApis } from '../use_data_stream_apis';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsModal } from '../settings/assistant_settings_modal';
import { AIConnector } from '../../connectorland/connector_selector';
import { SettingsContextMenu } from '../settings/settings_context_menu/settings_context_menu';
import * as i18n from './translations';

interface OwnProps {
  selectedConversation: Conversation | undefined;
  defaultConnector?: AIConnector;
  isDisabled: boolean;
  isLoading: boolean;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onChatCleared: () => void;
  onCloseFlyout?: () => void;
  chatHistoryVisible?: boolean;
  setChatHistoryVisible?: React.Dispatch<React.SetStateAction<boolean>>;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  onConversationCreate: () => Promise<void>;
  isAssistantEnabled: boolean;
  refetchPrompts?: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
}

type Props = OwnProps;

export const AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID = 'aiAssistantSettingsMenuContainer';

/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeader: React.FC<Props> = ({
  selectedConversation,
  defaultConnector,
  isDisabled,
  isLoading,
  isSettingsModalVisible,
  setIsSettingsModalVisible,
  onChatCleared,
  chatHistoryVisible,
  setChatHistoryVisible,
  onCloseFlyout,
  onConversationSelected,
  conversations,
  conversationsLoaded,
  refetchCurrentUserConversations,
  onConversationCreate,
  isAssistantEnabled,
  refetchPrompts,
}) => {
  const { euiTheme } = useEuiTheme();

  const selectedConnectorId = useMemo(
    () => selectedConversation?.apiConfig?.connectorId,
    [selectedConversation?.apiConfig?.connectorId]
  );

  const onConversationChange = useCallback(
    (updatedConversation: Conversation) => {
      onConversationSelected({
        cId: updatedConversation.id,
        cTitle: updatedConversation.title,
      });
    },
    [onConversationSelected]
  );

  return (
    <>
      <FlyoutNavigation
        isLoading={isLoading}
        isExpanded={!!chatHistoryVisible}
        setIsExpanded={setChatHistoryVisible}
        onConversationCreate={onConversationCreate}
        isAssistantEnabled={isAssistantEnabled}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <AssistantSettingsModal
              defaultConnector={defaultConnector}
              isDisabled={isDisabled}
              isSettingsModalVisible={isSettingsModalVisible}
              selectedConversationId={
                !isEmpty(selectedConversation?.id)
                  ? selectedConversation?.id
                  : selectedConversation?.title
              }
              setIsSettingsModalVisible={setIsSettingsModalVisible}
              onConversationSelected={onConversationSelected}
              conversations={conversations}
              conversationsLoaded={conversationsLoaded}
              refetchCurrentUserConversations={refetchCurrentUserConversations}
              refetchPrompts={refetchPrompts}
            />
          </EuiFlexItem>

          {onCloseFlyout && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.CLOSE}
                data-test-subj="euiFlyoutCloseButton"
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
          padding-top: ${euiTheme.size.s};
          padding-bottom: ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'} gutterSize="s">
          <EuiFlexItem
            css={css`
              overflow: hidden;
            `}
          >
            {isLoading ? (
              <EuiSkeletonTitle data-test-subj="skeletonTitle" size="xs" />
            ) : (
              <AssistantTitle
                isDisabled={isDisabled}
                title={selectedConversation?.title}
                selectedConversation={selectedConversation}
                refetchCurrentUserConversations={refetchCurrentUserConversations}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems={'center'}>
              <EuiFlexItem>
                <ConnectorSelectorInline
                  isDisabled={isDisabled || selectedConversation === undefined}
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={selectedConversation}
                  onConnectorSelected={onConversationChange}
                />
              </EuiFlexItem>
              <EuiFlexItem id={AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID}>
                <SettingsContextMenu isDisabled={isDisabled} onChatCleared={onChatCleared} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
