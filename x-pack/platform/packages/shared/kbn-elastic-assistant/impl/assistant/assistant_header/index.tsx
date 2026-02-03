/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPanel,
  EuiSkeletonTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ApiConfig, ConversationSharedState, User } from '@kbn/elastic-assistant-common';
import type { ConversationWithOwner } from '../api';
import { ConversationSettingsMenu } from '../settings/settings_context_menu/conversation_settings_menu';
import { ShareSelectModal } from '../share_conversation/share_select_modal';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';
import type { DataStreamApis } from '../use_data_stream_apis';
import type { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsModal } from '../settings/assistant_settings_modal';
import type { AIConnector } from '../../connectorland/connector_selector';
import { AssistantSettingsContextMenu } from '../settings/settings_context_menu/settings_context_menu';
import * as i18n from './translations';

interface OwnProps {
  conversationSharedState: ConversationSharedState;
  currentUser?: User;
  selectedConversation: Conversation | undefined;
  defaultConnector?: AIConnector;
  isConversationOwner: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onChatCleared: () => void;
  onConversationDeleted: (conversationId: string) => void;
  onCloseFlyout?: () => void;
  chatHistoryVisible?: boolean;
  setChatHistoryVisible?: React.Dispatch<React.SetStateAction<boolean>>;
  onConversationSelected: ({
    cId,
    cTitle,
    apiConfig,
  }: {
    apiConfig?: ApiConfig;
    cId: string;
    cTitle?: string;
  }) => void;
  conversations: Record<string, ConversationWithOwner>;
  conversationsLoaded: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  onConversationCreate: () => Promise<void>;
  isAssistantEnabled: boolean;
  refetchPrompts?: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

type Props = OwnProps;

export const AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID = 'aiAssistantSettingsMenuContainer';

/**
 * Renders the header of the Elastic AI Assistant.
 * Provide a user interface for selecting and managing conversations,
 * toggling the display of anonymized values, and accessing the assistant settings.
 */
export const AssistantHeader: React.FC<Props> = ({
  conversationSharedState,
  chatHistoryVisible,
  conversations,
  conversationsLoaded,
  currentUser,
  defaultConnector,
  isConversationOwner,
  isAssistantEnabled,
  isDisabled,
  isLoading,
  isSettingsModalVisible,
  onChatCleared,
  onCloseFlyout,
  onConversationCreate,
  onConversationDeleted,
  onConversationSelected,
  refetchCurrentConversation,
  refetchCurrentUserConversations,
  refetchPrompts,
  selectedConversation,
  setChatHistoryVisible,
  setCurrentConversation,
  setIsSettingsModalVisible,
  setPaginationObserver,
}) => {
  const { euiTheme } = useEuiTheme();

  const selectedConnectorId = useMemo(
    () => selectedConversation?.apiConfig?.connectorId,
    [selectedConversation?.apiConfig?.connectorId]
  );

  const onConversationChange = useCallback(
    (updatedConversation: Conversation, apiConfig?: ApiConfig) => {
      onConversationSelected({
        cId: updatedConversation.id,
        cTitle: updatedConversation.title,
        ...(apiConfig ? { apiConfig } : {}),
      });
    },
    [onConversationSelected]
  );

  const isNewConversation = useMemo(
    () => !selectedConversation || selectedConversation.id === '',
    [selectedConversation]
  );

  const userOwnedConversations = useMemo(
    () =>
      Object.values(conversations).reduce(
        (convos: Record<string, Conversation>, c: ConversationWithOwner) =>
          c.isConversationOwner
            ? {
                ...convos,
                [c.id]: c,
              }
            : convos,
        {}
      ),
    [conversations]
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
              setIsSettingsModalVisible={setIsSettingsModalVisible}
              onConversationSelected={onConversationSelected}
              conversations={userOwnedConversations}
              conversationsLoaded={conversationsLoaded}
              refetchCurrentConversation={refetchCurrentConversation}
              refetchCurrentUserConversations={refetchCurrentUserConversations}
              refetchPrompts={refetchPrompts}
              setPaginationObserver={setPaginationObserver}
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
        <EuiFlexGroup gutterSize="xs" wrap justifyContent="flexEnd">
          <EuiFlexItem
            css={css`
              overflow: hidden;
              min-width: 160px;
            `}
          >
            <EuiFlexGroup alignItems={'center'} justifyContent="flexStart" gutterSize="s">
              <EuiFlexItem
                grow={false}
                css={css`
                  overflow: hidden;
                `}
              >
                {isLoading ? (
                  <EuiSkeletonTitle data-test-subj="skeletonTitle" size="xs" />
                ) : (
                  <AssistantTitle
                    isDisabled={
                      isDisabled || selectedConversation?.id === '' || !isConversationOwner
                    }
                    title={selectedConversation?.title || NEW_CHAT}
                    selectedConversation={selectedConversation}
                    refetchCurrentUserConversations={refetchCurrentUserConversations}
                  />
                )}
              </EuiFlexItem>

              {!isNewConversation && !!currentUser && (
                <EuiFlexItem grow={false}>
                  <ShareSelectModal
                    conversationSharedState={conversationSharedState}
                    isConversationOwner={isConversationOwner}
                    selectedConversation={selectedConversation}
                    refetchCurrentUserConversations={refetchCurrentUserConversations}
                    refetchCurrentConversation={refetchCurrentConversation}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems={'center'} justifyContent="spaceBetween">
              <EuiFlexItem>
                <ConnectorSelectorInline
                  isDisabled={
                    isDisabled || selectedConversation === undefined || !isConversationOwner
                  }
                  selectedConnectorId={selectedConnectorId}
                  selectedConversation={selectedConversation}
                  onConnectorSelected={onConversationChange}
                />
              </EuiFlexItem>
              {!isNewConversation && (
                <EuiFlexItem>
                  <div id={AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID}>
                    <ConversationSettingsMenu
                      isConversationOwner={isConversationOwner}
                      isDisabled={isDisabled}
                      conversations={conversations}
                      onConversationSelected={onConversationSelected}
                      onConversationDeleted={onConversationDeleted}
                      onChatCleared={onChatCleared}
                      refetchCurrentUserConversations={refetchCurrentUserConversations}
                      selectedConversation={selectedConversation}
                      setCurrentConversation={setCurrentConversation}
                    />
                  </div>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <AssistantSettingsContextMenu isDisabled={isDisabled} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
