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
import { ApiConfig } from '@kbn/elastic-assistant-common';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';
import { DataStreamApis } from '../use_data_stream_apis';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConnectorSelectorInline } from '../../connectorland/connector_selector_inline/connector_selector_inline';
import { FlyoutNavigation } from '../assistant_overlay/flyout_navigation';
import { AssistantSettingsModal } from '../settings/assistant_settings_modal';
import { AIConnector } from '../../connectorland/connector_selector';
import { SettingsContextMenu } from '../settings/settings_context_menu/settings_context_menu';
import * as i18n from './translations';
import { ElasticLLMCostAwarenessTour } from '../../tour/elastic_llm';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../tour/const';

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
  onConversationSelected: ({
    cId,
    cTitle,
    apiConfig,
  }: {
    apiConfig?: ApiConfig;
    cId: string;
    cTitle?: string;
  }) => void;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  onConversationCreate: () => Promise<void>;
  isAssistantEnabled: boolean;
  refetchPrompts?: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
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
  chatHistoryVisible,
  conversations,
  conversationsLoaded,
  defaultConnector,
  isAssistantEnabled,
  isDisabled,
  isLoading,
  isSettingsModalVisible,
  onChatCleared,
  onCloseFlyout,
  onConversationCreate,
  onConversationSelected,
  refetchCurrentConversation,
  refetchCurrentUserConversations,
  refetchPrompts,
  selectedConversation,
  setChatHistoryVisible,
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
              conversations={conversations}
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
                isDisabled={isDisabled || selectedConversation?.id === ''}
                title={selectedConversation?.title || NEW_CHAT}
                selectedConversation={selectedConversation}
                refetchCurrentUserConversations={refetchCurrentUserConversations}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems={'center'}>
              <EuiFlexItem>
                <ElasticLLMCostAwarenessTour
                  isDisabled={isDisabled}
                  selectedConnectorId={selectedConnectorId}
                  storageKey={NEW_FEATURES_TOUR_STORAGE_KEYS.ELASTIC_LLM_USAGE_ASSISTANT_HEADER}
                >
                  <ConnectorSelectorInline
                    isDisabled={isDisabled || selectedConversation === undefined}
                    selectedConnectorId={selectedConnectorId}
                    selectedConversation={selectedConversation}
                    onConnectorSelected={onConversationChange}
                  />
                </ElasticLLMCostAwarenessTour>
              </EuiFlexItem>
              <EuiFlexItem id={AI_ASSISTANT_SETTINGS_MENU_CONTAINER_ID}>
                <SettingsContextMenu
                  isDisabled={isDisabled}
                  onChatCleared={onChatCleared}
                  selectedConversation={selectedConversation}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
