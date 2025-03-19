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
import { Conversation, ConversationAccess } from '@kbn/observability-ai-assistant-plugin/common';
import { ChatActionsMenu } from './chat_actions_menu';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { FlyoutPositionMode } from './chat_flyout';
import { ChatSharingMenu } from './chat_sharing_menu';
import { ChatContextMenu } from './chat_context_menu';
import { useConversationContextMenu } from '../hooks/use_conversation_context_menu';

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
  onDuplicateConversation,
  onSaveTitle,
  onToggleFlyoutPositionMode,
  navigateToConversation,
  setIsUpdatingConversationList,
  refreshConversations,
  updateDisplayedConversation,
  handleConversationAccessUpdate,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  conversation?: Conversation;
  flyoutPositionMode?: FlyoutPositionMode;
  licenseInvalid: boolean;
  loading: boolean;
  title: string;
  isConversationOwnedByCurrentUser: boolean;
  onDuplicateConversation: () => void;
  onSaveTitle: (title: string) => void;
  onToggleFlyoutPositionMode?: (newFlyoutPositionMode: FlyoutPositionMode) => void;
  navigateToConversation?: (nextConversationId?: string) => void;
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
  updateDisplayedConversation: (id?: string) => void;
  handleConversationAccessUpdate: (access: ConversationAccess) => Promise<void>;
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

  const { copyConversationToClipboard, copyUrl, deleteConversation } = useConversationContextMenu({
    setIsUpdatingConversationList,
    refreshConversations,
  });

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
                  color: ${!!title
                    ? theme.euiTheme.colors.textParagraph
                    : theme.euiTheme.colors.textSubdued};
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
                  !isConversationOwnedByCurrentUser
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
                <ChatActionsMenu connectors={connectors} disabled={licenseInvalid} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
