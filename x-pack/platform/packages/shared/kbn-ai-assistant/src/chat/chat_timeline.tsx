/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiCode, EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { omit } from 'lodash';
import {
  ChatActionClickPayload,
  ChatState,
  type Feedback,
  type Message,
  type ObservabilityAIAssistantChatService,
  type TelemetryEventTypeWithPayload,
  aiAssistantAnonymizationRules,
} from '@kbn/observability-ai-assistant-plugin/public';
import { AnonymizationRule } from '@kbn/observability-ai-assistant-plugin/common';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import { ChatItem } from './chat_item';
import { ChatConsolidatedItems } from './chat_consolidated_items';
import { getTimelineItemsfromConversation } from '../utils/get_timeline_items_from_conversation';
import { useKibana } from '../hooks/use_kibana';
import { ElasticLlmConversationCallout } from './elastic_llm_conversation_callout';

export interface ChatTimelineItem
  extends Pick<Message['message'], 'role' | 'content' | 'function_call'> {
  id: string;
  title: ReactNode;
  actions: {
    canCopy: boolean;
    canEdit: boolean;
    canGiveFeedback: boolean;
    canRegenerate: boolean;
  };
  display: {
    collapsed: boolean;
    hide?: boolean;
  };
  loading: boolean;
  element?: React.ReactNode;
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  error?: any;
  message: Message;
  functionCall?: Message['message']['function_call'];
  anonymizedHighlightedContent?: React.ReactNode;
}

export interface ChatTimelineProps {
  conversationId?: string;
  messages: Message[];
  knowledgeBase: UseKnowledgeBaseResult;
  chatService: ObservabilityAIAssistantChatService;
  hasConnector: boolean;
  chatState: ChatState;
  isConversationOwnedByCurrentUser: boolean;
  isArchived: boolean;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  showElasticLlmCalloutInChat: boolean;
  onEdit: (message: Message, messageAfterEdit: Message) => void;
  onFeedback: (feedback: Feedback) => void;
  onRegenerate: (message: Message) => void;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onStopGenerating: () => void;
  onActionClick: ({
    message,
    payload,
  }: {
    message: Message;
    payload: ChatActionClickPayload;
  }) => void;
}

// helper using detected entity positions to transform user messages into react node to add text highlighting
function highlightContent(
  content: string,
  detectedEntities: Array<{ start_pos: number; end_pos: number; entity: string }>
): React.ReactNode {
  // Sort the entities by start position
  const sortedEntities = [...detectedEntities].sort((a, b) => a.start_pos - b.start_pos);
  const parts: Array<string | React.ReactNode> = [];
  let lastIndex = 0;
  sortedEntities.forEach((entity, index) => {
    // Add the text before the entity
    if (entity.start_pos > lastIndex) {
      parts.push(content.substring(lastIndex, entity.start_pos));
    }
    // Wrap the sensitive text in a span with highlight styles
    parts.push(
      <EuiCode key={`user-highlight-${index}`}>
        {content.substring(entity.start_pos, entity.end_pos)}
      </EuiCode>
    );
    lastIndex = entity.end_pos;
  });
  // Add any remaining text after the last entity
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return parts;
}
const euiCommentListClassName = css`
  padding-bottom: 32px;
`;

const stickyElasticLlmCalloutContainerClassName = css`
  position: sticky;
  top: 0;
  z-index: 1;
`;

export function ChatTimeline({
  conversationId,
  messages,
  chatService,
  hasConnector,
  currentUser,
  isConversationOwnedByCurrentUser,
  isArchived,
  showElasticLlmCalloutInChat,
  onEdit,
  onFeedback,
  onRegenerate,
  onSendTelemetry,
  onStopGenerating,
  onActionClick,
  chatState,
}: ChatTimelineProps) {
  const {
    services: { uiSettings },
  } = useKibana();

  const { anonymizationEnabled } = useMemo(() => {
    try {
      const rules = uiSettings?.get<AnonymizationRule[]>(aiAssistantAnonymizationRules);
      return {
        anonymizationEnabled: Array.isArray(rules) && rules.some((rule) => rule.enabled),
      };
    } catch (e) {
      return { anonymizationEnabled: false };
    }
  }, [uiSettings]);

  const items = useMemo(() => {
    const timelineItems = getTimelineItemsfromConversation({
      conversationId,
      chatService,
      hasConnector,
      messages,
      currentUser,
      isConversationOwnedByCurrentUser,
      chatState,
      onActionClick,
      isArchived,
    });

    const consolidatedChatItems: Array<ChatTimelineItem | ChatTimelineItem[]> = [];
    let currentGroup: ChatTimelineItem[] | null = null;

    for (const item of timelineItems) {
      const { role, content, unredactions } = item.message.message;
      if (item.display.hide || !item) continue;

      if (anonymizationEnabled && role === 'user' && content && unredactions) {
        item.anonymizedHighlightedContent = highlightContent(content, unredactions);
      }

      if (item.display.collapsed) {
        if (currentGroup) {
          currentGroup.push(item);
        } else {
          currentGroup = [item];
          consolidatedChatItems.push(currentGroup);
        }
      } else {
        consolidatedChatItems.push(item);
        currentGroup = null;
      }
    }

    return consolidatedChatItems;
  }, [
    conversationId,
    chatService,
    hasConnector,
    messages,
    currentUser,
    chatState,
    isConversationOwnedByCurrentUser,
    isArchived,
    onActionClick,
    anonymizationEnabled,
  ]);

  return (
    <EuiCommentList className={euiCommentListClassName}>
      {showElasticLlmCalloutInChat ? (
        <div className={stickyElasticLlmCalloutContainerClassName}>
          <ElasticLlmConversationCallout />
        </div>
      ) : null}
      {items.map((item, index) => {
        return Array.isArray(item) ? (
          <ChatConsolidatedItems
            key={index}
            consolidatedItem={item}
            onActionClick={onActionClick}
            onEditSubmit={onEdit}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
            onSendTelemetry={onSendTelemetry}
            onStopGenerating={onStopGenerating}
            isConversationOwnedByCurrentUser={isConversationOwnedByCurrentUser}
          />
        ) : (
          <ChatItem
            // use index, not id to prevent unmounting of component when message is persisted
            key={index}
            {...omit(item, 'message')}
            onActionClick={(payload) => {
              onActionClick({ message: item.message, payload });
            }}
            onFeedbackClick={(feedback) => onFeedback(feedback)}
            onRegenerateClick={() => {
              onRegenerate(item.message);
            }}
            onEditSubmit={(message) => {
              onEdit(item.message, message);
            }}
            onSendTelemetry={onSendTelemetry}
            onStopGeneratingClick={onStopGenerating}
            isConversationOwnedByCurrentUser={isConversationOwnedByCurrentUser}
          />
        );
      })}
    </EuiCommentList>
  );
}
