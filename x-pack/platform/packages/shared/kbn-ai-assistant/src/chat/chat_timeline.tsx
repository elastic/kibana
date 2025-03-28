/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { omit } from 'lodash';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatActionClickPayload,
  ChatState,
  type Feedback,
  type ObservabilityAIAssistantChatService,
  type TelemetryEventTypeWithPayload,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import { ChatItem } from './chat_item';
import { ChatConsolidatedItems } from './chat_consolidated_items';
import { getTimelineItemsfromConversation } from '../utils/get_timeline_items_from_conversation';

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
  displayContent?: React.ReactNode;
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

const highlightPIIClassName = css`
  background-color: #ffeb3b;
  padding: 2px 4px;
  border-radius: 3px;
`;

// helper using NER positions to transform user messages into react node to add text highlighting
function transformUserContent(
  content: string,
  nerEntities: Array<{ start_pos: number; end_pos: number; entity: string }>
): React.ReactNode {
  // Sort the entities by start position
  const sortedEntities = [...nerEntities].sort((a, b) => a.start_pos - b.start_pos);
  const parts: Array<string | React.ReactNode> = [];
  let lastIndex = 0;
  sortedEntities.forEach((entity, index) => {
    // Add the text before the entity
    if (entity.start_pos > lastIndex) {
      parts.push(content.substring(lastIndex, entity.start_pos));
    }
    // Wrap the sensitive text in a span with highlight styles
    parts.push(
      <span key={`user-highlight-${index}`} className={highlightPIIClassName}>
        {content.substring(entity.start_pos, entity.end_pos)}
      </span>
    );
    lastIndex = entity.end_pos;
  });
  // Add any remaining text after the last entity
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return parts;
}

// processes a string and replaces each occurrence of a hash (key)
// with a <span> wrapping the corresponding original text from the redactedEntitiesMap.
function transformAssistantContent(
  content: string,
  redactedEntitiesMap: Record<string, string>
): React.ReactNode {
  let parts: Array<string | React.ReactNode> = [content];
  Object.keys(redactedEntitiesMap).forEach((hash) => {
    const newParts: Array<string | React.ReactNode> = [];
    parts.forEach((part) => {
      if (typeof part === 'string') {
        // Split the string on the current hash
        const segments = part.split(hash);
        segments.forEach((segment, index) => {
          newParts.push(segment);
          // Insert the highlighted replacement if not at the end
          if (index < segments.length - 1) {
            newParts.push(
              <span key={hash + '-' + index} className={highlightPIIClassName}>
                {redactedEntitiesMap[hash]}
              </span>
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });
  return parts;
}

export function ChatTimeline({
  conversationId,
  messages,
  chatService,
  hasConnector,
  currentUser,
  isConversationOwnedByCurrentUser,
  isArchived,
  onEdit,
  onFeedback,
  onRegenerate,
  onSendTelemetry,
  onStopGenerating,
  onActionClick,
  chatState,
}: ChatTimelineProps) {
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

    const redactedEntitiesMap: Record<string, string> = {};
    const consolidatedChatItems: Array<ChatTimelineItem | ChatTimelineItem[]> = [];
    let currentGroup: ChatTimelineItem[] | null = null;

    for (const item of timelineItems) {
      if (item.display.hide || !item) continue;

      let displayContent: React.ReactNode;

      // build redactedEntitiesMap with user messages using NER positions.
      if (item.message.message.role === 'user' && item.message.message.content) {
        if (item.message.message.sanitized && Array.isArray(item.message.message.nerEntities)) {
          item.message.message.nerEntities.forEach((entity) => {
            redactedEntitiesMap[entity.id] = entity.entity;
          });
          // transform user messages to react nodes to highlight the sensitive portions in the user message.
          displayContent = transformUserContent(
            item.message.message.content,
            item.message.message.nerEntities
          );
        } else {
          displayContent = item.message.message.content;
        }
      }
      // Process assistant messages: transform the content using the cumulative redactedEntitiesMap.
      else if (item.message.message.role === 'assistant' && item.message.message.content) {
        displayContent = transformAssistantContent(
          item.message.message.content,
          redactedEntitiesMap
        );
      }

      // Create a new item that includes the computed displayContent.
      const newItem = { ...item, displayContent };

      if (item.display.collapsed) {
        if (currentGroup) {
          currentGroup.push(newItem);
        } else {
          currentGroup = [newItem];
          consolidatedChatItems.push(currentGroup);
        }
      } else {
        consolidatedChatItems.push(newItem);
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
  ]);

  return (
    <EuiCommentList
      className={css`
        padding-bottom: 32px;
      `}
    >
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
            displayContent={item.displayContent}
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
