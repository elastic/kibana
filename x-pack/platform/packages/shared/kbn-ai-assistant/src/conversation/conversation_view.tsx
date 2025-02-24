/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { isEqual } from 'lodash';
import { useKibana } from '../hooks/use_kibana';
import { ConversationList, ChatBody, ChatInlineEditingContent } from '../chat';
import { useConversationKey } from '../hooks/use_conversation_key';
import { useCurrentUser } from '../hooks/use_current_user';
import { useGenAIConnectors } from '../hooks/use_genai_connectors';
import { useKnowledgeBase } from '../hooks/use_knowledge_base';
import { useAIAssistantAppService } from '../hooks/use_ai_assistant_app_service';
import { useAbortableAsync } from '../hooks/use_abortable_async';
import { useConversationList } from '../hooks/use_conversation_list';

const SECOND_SLOT_CONTAINER_WIDTH = 400;

interface ConversationViewProps {
  conversationId?: string;
  navigateToConversation?: (nextConversationId?: string) => void;
  getConversationHref?: (conversationId: string) => string;
  newConversationHref?: string;
  scopes?: AssistantScope[];
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  navigateToConversation,
  getConversationHref,
  newConversationHref,
  scopes,
}) => {
  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const service = useAIAssistantAppService();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const {
    services: {
      observabilityAIAssistant: { ObservabilityAIAssistantChatServiceContext },
    },
  } = useKibana();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return service.start({ signal });
    },
    [service]
  );

  useEffect(() => {
    if (scopes && !isEqual(scopes, service.getScopes())) {
      service.setScopes(scopes);
    }
  }, [scopes, service]);

  const { key: bodyKey, updateConversationIdInPlace } = useConversationKey(conversationId);

  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  const conversationList = useConversationList();

  function handleRefreshConversations() {
    conversationList.conversations.refresh();
  }

  const handleConversationUpdate = (conversation: { conversation: { id: string } }) => {
    if (!conversationId) {
      updateConversationIdInPlace(conversation.conversation.id);
      if (navigateToConversation) {
        navigateToConversation(conversation.conversation.id);
      }
    }
    handleRefreshConversations();
  };

  useEffect(() => {
    return () => {
      setIsSecondSlotVisible(false);
      if (secondSlotContainer) {
        ReactDOM.unmountComponentAtNode(secondSlotContainer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerClassName = css`
    max-width: 100%;
  `;

  const conversationListContainerName = css`
    min-width: 250px;
    width: 250px;
    border-right: solid 1px ${euiTheme.border.color};
  `;

  const sidebarContainerClass = css`
    display: flex;
    position: absolute;
    z-index: 1;
    top: 56px;
    right: 0;
    height: calc(100% - 56px);
    background-color: ${euiTheme.colors.lightestShade};
    width: ${isSecondSlotVisible ? SECOND_SLOT_CONTAINER_WIDTH : 0}px;
    border-top: solid 1px ${euiTheme.border.color};
    border-left: solid 1px ${euiTheme.border.color};

    .euiFlyoutHeader {
      padding: ${euiTheme.size.m};
    }

    .euiFlyoutFooter {
      padding: ${euiTheme.size.m};
      padding-top: ${euiTheme.size.l};
      padding-bottom: ${euiTheme.size.l};
    }
  `;

  return (
    <EuiFlexGroup
      direction="row"
      className={containerClassName}
      gutterSize="none"
      data-test-subj="observabilityAiAssistantConversationsPage"
    >
      <EuiFlexItem grow={false} className={conversationListContainerName}>
        <ConversationList
          selectedConversationId={conversationId}
          conversations={conversationList.conversations}
          isLoading={conversationList.isLoading}
          onConversationDeleteClick={(deletedConversationId) => {
            conversationList.deleteConversation(deletedConversationId).then(() => {
              if (deletedConversationId === conversationId && navigateToConversation) {
                navigateToConversation(undefined);
              }
            });
          }}
          newConversationHref={newConversationHref}
          onConversationSelect={navigateToConversation}
          getConversationHref={getConversationHref}
        />
        <EuiSpacer size="s" />
      </EuiFlexItem>

      {!chatService.value ? (
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xl" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {chatService.value && (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <ChatBody
            key={bodyKey}
            currentUser={currentUser}
            connectors={connectors}
            initialConversationId={conversationId}
            knowledgeBase={knowledgeBase}
            showLinkToConversationsApp={false}
            onConversationUpdate={handleConversationUpdate}
            navigateToConversation={navigateToConversation}
          />

          <div className={sidebarContainerClass}>
            <ChatInlineEditingContent
              setContainer={setSecondSlotContainer}
              visible={isSecondSlotVisible}
              style={{ width: '100%' }}
            />
          </div>
        </ObservabilityAIAssistantChatServiceContext.Provider>
      )}
    </EuiFlexGroup>
  );
};
