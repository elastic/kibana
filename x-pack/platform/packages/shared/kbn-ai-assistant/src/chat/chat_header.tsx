/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type {
  Conversation,
  ConversationAccess,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  ElasticLlmTourCallout,
  getElasticManagedLlmConnector,
  ElasticLlmCalloutKey,
  useElasticLlmCalloutDismissed,
  useObservabilityAIAssistantFlyoutStateContext,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import { ChatActionsMenu } from './chat_actions_menu';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { FlyoutPositionMode } from './chat_flyout';
import { ChatSharingMenu } from './chat_sharing_menu';
import { ChatContextMenu } from './chat_context_menu';

// needed to prevent InlineTextEdit component from expanding container
const minWidthClassName = css`
  min-width: 0;
`;

const minMaxWidthClassName = css`
  min-width: 0;
  max-width: 80%;
`;

const chatHeaderClassName = css`
  padding-top: 12px;
  padding-bottom: 12px;
`;

const chatHeaderMobileClassName = css`
  padding-top: 8px;
  padding-bottom: 8px;
`;

export function ChatHeader({
  connectors,
  conversationId,
  conversation,
  flyoutPositionMode,
  licenseInvalid,
  loading,
  title,
  isConversationOwnedByCurrentUser,
  isConversationApp,
  onDuplicateConversation,
  onSaveTitle,
  onToggleFlyoutPositionMode,
  navigateToConversation,
  updateDisplayedConversation,
  handleConversationAccessUpdate,
  copyConversationToClipboard,
  copyUrl,
  deleteConversation,
  handleArchiveConversation,
  navigateToConnectorsManagementApp,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  conversation?: Conversation;
  flyoutPositionMode?: FlyoutPositionMode;
  licenseInvalid: boolean;
  loading: boolean;
  title: string;
  isConversationOwnedByCurrentUser: boolean;
  isConversationApp: boolean;
  onDuplicateConversation: () => void;
  onSaveTitle: (title: string) => void;
  onToggleFlyoutPositionMode?: (newFlyoutPositionMode: FlyoutPositionMode) => void;
  navigateToConversation?: (nextConversationId?: string) => void;
  updateDisplayedConversation: (id?: string) => void;
  handleConversationAccessUpdate: (access: ConversationAccess) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  copyConversationToClipboard: (conversation: Conversation) => void;
  copyUrl: (id: string) => void;
  handleArchiveConversation: (id: string, isArchived: boolean) => Promise<void>;
  navigateToConnectorsManagementApp: (application: ApplicationStart) => void;
}) {
  const theme = useEuiTheme();
  const breakpoint = useCurrentEuiBreakpoint();

  const [newTitle, setNewTitle] = useState(title);

  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const handleToggleFlyoutPositionMode = () => {
    if (flyoutPositionMode) {
      onToggleFlyoutPositionMode?.(
        flyoutPositionMode === FlyoutPositionMode.OVERLAY
          ? FlyoutPositionMode.PUSH
          : FlyoutPositionMode.OVERLAY
      );
    }
  };

  const elasticManagedLlm = getElasticManagedLlmConnector(connectors.connectors);
  const [tourCalloutDismissed, setTourCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.TOUR_CALLOUT,
    false
  );

  const { isFlyoutOpen } = useObservabilityAIAssistantFlyoutStateContext();

  return (
    <EuiPanel
      borderRadius="none"
      className={breakpoint === 'xs' ? chatHeaderMobileClassName : chatHeaderClassName}
      hasBorder={false}
      hasShadow={false}
      paddingSize="s"
    >
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          {loading ? (
            <EuiLoadingSpinner size={breakpoint === 'xs' ? 'm' : 'l'} />
          ) : (
            <AssistantIcon size={breakpoint === 'xs' ? 'm' : 'l'} />
          )}
        </EuiFlexItem>

        <EuiFlexGroup
          gutterSize="xs"
          justifyContent="spaceBetween"
          alignItems="center"
          className={minWidthClassName}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" className={minMaxWidthClassName}>
            <EuiFlexItem grow={false} className={minWidthClassName}>
              <EuiInlineEditTitle
                heading="h2"
                size={breakpoint === 'xs' ? 'xs' : 's'}
                value={newTitle}
                className={css`
                  .euiTitle {
                    color: ${!conversation?.archived
                      ? theme.euiTheme.colors.textParagraph
                      : theme.euiTheme.colors.textSubdued};
                  }
                `}
                inputAriaLabel={i18n.translate(
                  'xpack.aiAssistant.chatHeader.editConversationInput',
                  {
                    defaultMessage: 'Edit conversation',
                  }
                )}
                isReadOnly={
                  !conversationId ||
                  !connectors.selectedConnector ||
                  licenseInvalid ||
                  !Boolean(onSaveTitle) ||
                  !isConversationOwnedByCurrentUser ||
                  conversation?.archived
                }
                onChange={(e) => {
                  setNewTitle(e.currentTarget.nodeValue || '');
                }}
                onSave={onSaveTitle}
                onCancel={() => {
                  setNewTitle(title);
                }}
                editModeProps={{
                  formRowProps: {
                    fullWidth: true,
                  },
                }}
              />
            </EuiFlexItem>

            {conversationId && conversation ? (
              <>
                <EuiFlexItem grow={false}>
                  <ChatSharingMenu
                    isPublic={conversation.public}
                    isArchived={!!conversation.archived}
                    onChangeConversationAccess={handleConversationAccessUpdate}
                    disabled={licenseInvalid || !isConversationOwnedByCurrentUser}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ChatContextMenu
                    disabled={licenseInvalid}
                    onCopyToClipboardClick={() => copyConversationToClipboard(conversation)}
                    onCopyUrlClick={() => copyUrl(conversationId)}
                    onDeleteClick={() => {
                      deleteConversation(conversationId).then(() => updateDisplayedConversation());
                    }}
                    isConversationOwnedByCurrentUser={isConversationOwnedByCurrentUser}
                    onDuplicateConversationClick={onDuplicateConversation}
                    conversationTitle={conversation.conversation.title}
                    onArchiveConversation={() =>
                      handleArchiveConversation(conversationId, !conversation.archived)
                    }
                    isArchived={!!conversation.archived}
                  />
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {flyoutPositionMode && onToggleFlyoutPositionMode ? (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      anchorPosition="downLeft"
                      button={
                        <EuiToolTip
                          content={
                            flyoutPositionMode === 'overlay'
                              ? i18n.translate(
                                  'xpack.aiAssistant.chatHeader.euiToolTip.flyoutModeLabel.dock',
                                  { defaultMessage: 'Dock conversation' }
                                )
                              : i18n.translate(
                                  'xpack.aiAssistant.chatHeader.euiToolTip.flyoutModeLabel.undock',
                                  { defaultMessage: 'Undock conversation' }
                                )
                          }
                          display="block"
                        >
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.aiAssistant.chatHeader.euiButtonIcon.toggleFlyoutModeLabel',
                              { defaultMessage: 'Toggle flyout mode' }
                            )}
                            data-test-subj="observabilityAiAssistantChatHeaderButton"
                            iconType={flyoutPositionMode === 'overlay' ? 'menuRight' : 'menuLeft'}
                            onClick={handleToggleFlyoutPositionMode}
                          />
                        </EuiToolTip>
                      }
                    />
                  </EuiFlexItem>
                  {navigateToConversation ? (
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        anchorPosition="downLeft"
                        button={
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.aiAssistant.chatHeader.euiToolTip.navigateToConversationsLabel',
                              { defaultMessage: 'Navigate to conversations' }
                            )}
                            display="block"
                          >
                            <EuiButtonIcon
                              aria-label={i18n.translate(
                                'xpack.aiAssistant.chatHeader.euiButtonIcon.navigateToConversationsLabel',
                                { defaultMessage: 'Navigate to conversations' }
                              )}
                              data-test-subj="observabilityAiAssistantChatHeaderButton"
                              iconType="discuss"
                              onClick={() => navigateToConversation(conversationId)}
                            />
                          </EuiToolTip>
                        }
                      />
                    </EuiFlexItem>
                  ) : null}
                </>
              ) : null}

              <EuiFlexItem grow={false}>
                {!!elasticManagedLlm &&
                !tourCalloutDismissed &&
                !(isConversationApp && isFlyoutOpen) ? (
                  <ElasticLlmTourCallout dismissTour={() => setTourCalloutDismissed(true)}>
                    <ChatActionsMenu
                      connectors={connectors}
                      disabled={licenseInvalid}
                      navigateToConnectorsManagementApp={navigateToConnectorsManagementApp}
                    />
                  </ElasticLlmTourCallout>
                ) : (
                  <ChatActionsMenu
                    connectors={connectors}
                    disabled={licenseInvalid}
                    navigateToConnectorsManagementApp={navigateToConnectorsManagementApp}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
