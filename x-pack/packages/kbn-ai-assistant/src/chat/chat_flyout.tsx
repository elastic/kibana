/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiPopover,
  EuiToolTip,
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { Message } from '@kbn/observability-ai-assistant-plugin/common';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useConversationKey } from '../hooks/use_conversation_key';
import { useConversationList } from '../hooks/use_conversation_list';
import { useCurrentUser } from '../hooks/use_current_user';
import { useGenAIConnectors } from '../hooks/use_genai_connectors';
import { ChatBody } from './chat_body';
import { ChatInlineEditingContent } from './chat_inline_edit';
import { ConversationList } from './conversation_list';
import { useKibana } from '../hooks/use_kibana';
import { useKnowledgeBase } from '../hooks/use_knowledge_base';
import { NewChatButton } from '../buttons/new_chat_button';

const CONVERSATIONS_SIDEBAR_WIDTH = 260;
const CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED = 34;

const SIDEBAR_WIDTH = 400;

export enum FlyoutPositionMode {
  PUSH = 'push',
  OVERLAY = 'overlay',
}

export function ChatFlyout({
  initialTitle,
  initialMessages,
  initialFlyoutPositionMode,
  isOpen,
  onClose,
  navigateToConversation,
  hideConversationList,
}: {
  initialTitle: string;
  initialMessages: Message[];
  initialFlyoutPositionMode?: FlyoutPositionMode;
  isOpen: boolean;
  onClose: () => void;
  navigateToConversation?: (conversationId?: string) => void;
  hideConversationList?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const breakpoint = useCurrentEuiBreakpoint();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [flyoutPositionMode, setFlyoutPositionMode] = useState<FlyoutPositionMode>(
    initialFlyoutPositionMode || FlyoutPositionMode.OVERLAY
  );

  const [conversationsExpanded, setConversationsExpanded] = useState(false);

  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  const {
    services: {
      observabilityAIAssistant: { ObservabilityAIAssistantMultipaneFlyoutContext },
    },
  } = useKibana();
  const conversationList = useConversationList();

  const { key: bodyKey, updateConversationIdInPlace } = useConversationKey(conversationId);

  const flyoutClassName = css`
    max-inline-size: 100% !important;
  `;

  const sidebarClass = css`
    max-width: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH
      : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    min-width: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH
      : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    border-right: solid 1px ${euiTheme.border.color};
  `;

  const expandButtonContainerClassName = css`
    position: absolute;
    margin-top: 16px;
    margin-left: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    z-index: 1;
  `;

  const expandButtonClassName = css`
    color: ${euiTheme.colors.primary};
  `;

  const containerClassName = css`
    height: 100%;
    flex-wrap: nowrap;
  `;

  const chatBodyContainerClassName = css`
    min-width: 0;
  `;

  const hideClassName = css`
    display: none;
  `;

  const newChatButtonClassName = css`
    position: absolute;
    bottom: 30px;
    margin-left: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    z-index: 1;
  `;

  const handleToggleFlyoutPositionMode = (newFlyoutPositionMode: FlyoutPositionMode) => {
    setFlyoutPositionMode(newFlyoutPositionMode);
  };

  return isOpen ? (
    <ObservabilityAIAssistantMultipaneFlyoutContext.Provider
      value={{
        container: secondSlotContainer,
        setVisibility: setIsSecondSlotVisible,
      }}
    >
      <EuiFlyoutResizable
        aria-label={i18n.translate(
          'xpack.aiAssistant.chatFlyout.euiFlyoutResizable.aiAssistantLabel',
          { defaultMessage: 'AI Assistant Chat Flyout' }
        )}
        className={flyoutClassName}
        closeButtonProps={{
          css: {
            marginRight: breakpoint === 'xs' ? euiTheme.size.xs : euiTheme.size.s,
            marginTop: breakpoint === 'xs' ? euiTheme.size.xs : euiTheme.size.s,
          },
        }}
        paddingSize="m"
        pushAnimation
        minWidth={SIDEBAR_WIDTH}
        size={getFlyoutWidth({
          breakpoint,
          expanded: conversationsExpanded,
          isSecondSlotVisible,
        })}
        type={flyoutPositionMode}
        onClose={() => {
          onClose();
          setIsSecondSlotVisible(false);
          if (secondSlotContainer) {
            ReactDOM.unmountComponentAtNode(secondSlotContainer);
          }
        }}
      >
        <EuiFlexGroup gutterSize="none" className={containerClassName}>
          {!hideConversationList ? (
            <EuiFlexItem className={breakpoint === 'xs' ? hideClassName : sidebarClass}>
              <EuiPopover
                anchorPosition="downLeft"
                className={expandButtonContainerClassName}
                button={
                  <EuiToolTip
                    content={
                      conversationsExpanded
                        ? i18n.translate(
                            'xpack.aiAssistant.chatFlyout.euiToolTip.collapseConversationListLabel',
                            { defaultMessage: 'Collapse conversation list' }
                          )
                        : i18n.translate(
                            'xpack.aiAssistant.chatFlyout.euiToolTip.expandConversationListLabel',
                            { defaultMessage: 'Expand conversation list' }
                          )
                    }
                    display="block"
                  >
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.aiAssistant.chatFlyout.euiButtonIcon.expandConversationListLabel',
                        { defaultMessage: 'Expand conversation list' }
                      )}
                      className={expandButtonClassName}
                      color="text"
                      data-test-subj="observabilityAiAssistantChatFlyoutButton"
                      iconType={conversationsExpanded ? 'transitionLeftIn' : 'transitionLeftOut'}
                      onClick={() => setConversationsExpanded(!conversationsExpanded)}
                    />
                  </EuiToolTip>
                }
              />

              {conversationsExpanded ? (
                <ConversationList
                  conversations={conversationList.conversations}
                  isLoading={conversationList.isLoading}
                  selectedConversationId={conversationId}
                  onConversationDeleteClick={(deletedConversationId) => {
                    conversationList.deleteConversation(deletedConversationId).then(() => {
                      if (deletedConversationId === conversationId) {
                        setConversationId(undefined);
                      }
                    });
                  }}
                  onConversationSelect={(nextConversationId) => {
                    setConversationId(nextConversationId);
                  }}
                />
              ) : (
                <EuiPopover
                  anchorPosition="downLeft"
                  button={
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.aiAssistant.chatFlyout.euiToolTip.newChatLabel',
                        { defaultMessage: 'New conversation' }
                      )}
                      display="block"
                    >
                      <NewChatButton
                        aria-label={i18n.translate(
                          'xpack.aiAssistant.chatFlyout.euiButtonIcon.newChatLabel',
                          { defaultMessage: 'New conversation' }
                        )}
                        collapsed
                        data-test-subj="observabilityAiAssistantNewChatFlyoutButton"
                        onClick={() => {
                          setConversationId(undefined);
                        }}
                      />
                    </EuiToolTip>
                  }
                  className={newChatButtonClassName}
                />
              )}
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem className={chatBodyContainerClassName}>
            <ChatBody
              key={bodyKey}
              connectors={connectors}
              currentUser={currentUser}
              flyoutPositionMode={flyoutPositionMode}
              initialTitle={initialTitle}
              initialMessages={initialMessages}
              initialConversationId={conversationId}
              knowledgeBase={knowledgeBase}
              showLinkToConversationsApp
              onConversationUpdate={(conversation) => {
                if (!conversationId) {
                  updateConversationIdInPlace(conversation.conversation.id);
                }
                setConversationId(conversation.conversation.id);
                conversationList.conversations.refresh();
              }}
              onToggleFlyoutPositionMode={handleToggleFlyoutPositionMode}
              navigateToConversation={
                navigateToConversation
                  ? (newConversationId?: string) => {
                      if (onClose) onClose();
                      navigateToConversation(newConversationId);
                    }
                  : undefined
              }
            />
          </EuiFlexItem>

          <EuiFlexItem
            style={{
              maxWidth: isSecondSlotVisible ? SIDEBAR_WIDTH : 0,
              paddingTop: '56px',
            }}
          >
            <ChatInlineEditingContent
              setContainer={setSecondSlotContainer}
              visible={isSecondSlotVisible}
              style={{
                borderTop: `solid 1px ${euiTheme.border.color}`,
                borderLeft: `solid 1px ${euiTheme.border.color}`,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutResizable>
    </ObservabilityAIAssistantMultipaneFlyoutContext.Provider>
  ) : null;
}

const getFlyoutWidth = ({
  breakpoint,
  expanded,
  isSecondSlotVisible,
}: {
  breakpoint?: string;
  expanded: boolean;
  isSecondSlotVisible: boolean;
}) => {
  if (breakpoint === 'xs') {
    return '90vw';
  }
  if (!expanded && !isSecondSlotVisible) {
    return '40vw';
  }
  if (expanded && !isSecondSlotVisible) {
    return `calc(40vw + ${CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px`;
  }
  if (!expanded && isSecondSlotVisible) {
    return `calc(40vw + ${SIDEBAR_WIDTH}px`;
  }

  return `calc(40vw + ${
    CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
  }px + ${SIDEBAR_WIDTH}px`;
};
