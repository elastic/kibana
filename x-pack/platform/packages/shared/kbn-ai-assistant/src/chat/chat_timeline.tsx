/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo } from 'react';
import { css } from '@emotion/css';
import { EuiCommentList, useEuiTheme } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { omit } from 'lodash';
import {
  ChatActionClickPayload,
  ChatState,
  type Feedback,
  type Message,
  type ObservabilityAIAssistantChatService,
  type TelemetryEventTypeWithPayload,
} from '@kbn/observability-ai-assistant-plugin/public';
import { aiAssistantAnonymizationSettings } from '@kbn/inference-common';
import { AnonymizationSettings } from '@kbn/inference-common';
import { ChatItem } from './chat_item';
import { ChatConsolidatedItems } from './chat_consolidated_items';
import { getTimelineItemsfromConversation } from '../utils/get_timeline_items_from_conversation';
import { useKibana } from '../hooks/use_kibana';
import { ElasticLlmConversationCallout } from './elastic_llm_conversation_callout';
import { KnowledgeBaseReindexingCallout } from '../knowledge_base/knowledge_base_reindexing_callout';

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
  chatService: ObservabilityAIAssistantChatService;
  hasConnector: boolean;
  chatState: ChatState;
  isConversationOwnedByCurrentUser: boolean;
  isArchived: boolean;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  showElasticLlmCalloutInChat: boolean;
  showKnowledgeBaseReIndexingCallout: boolean;
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
export function highlightContent(
  content: string,
  detectedEntities: Array<{
    start: number;
    end: number;
    entity: { class_name: string; value: string; mask: string };
  }>
): React.ReactNode {
  // Sort the entities by start position
  const sortedEntities = [...detectedEntities].sort((a, b) => a.start - b.start);
  const parts: Array<string | React.ReactNode> = [];
  let lastIndex = 0;
  sortedEntities.forEach((entity, index) => {
    // Add the text before the entity
    if (entity.start > lastIndex) {
      parts.push(content.substring(lastIndex, entity.start));
    }

    // Currently only highlighting the content that's not inside code blocks
    if (isInsideInlineCode(content, entity.start) || isInsideCodeBlock(content, entity.start)) {
      parts.push(`${content.substring(entity.start, entity.end)}`);
    } else {
      parts.push(
        `!{anonymized{"entityClass":"${entity.entity.class_name}","content":"${content.substring(
          entity.start,
          entity.end
        )}"}}`
      );
    }
    lastIndex = entity.end;
  });
  // Add any remaining text after the last entity
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return parts.join('');
}

// Count how many ``` fences exist before pos. An odd count means pos is inside a fenced block
const isInsideCodeBlock = (src: string, pos: number): boolean =>
  (src.slice(0, pos).match(/```/g) || []).length % 2 === 1;

const isInsideInlineCode = (src: string, pos: number): boolean =>
  Array.from(src.matchAll(/`([^`\\]|\\.)*?`/g)).some((m) => {
    const start = m.index!;
    return pos >= start && pos < start + m[0].length;
  });

const euiCommentListClassName = css`
  padding-bottom: 32px;
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
  showKnowledgeBaseReIndexingCallout,
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
    // the response is JSON but will be a string while the setting is hidden temporarily (unregistered)
    const anonymizationRulesSettingsStr = uiSettings?.get<string | undefined>(
      aiAssistantAnonymizationSettings,
      JSON.stringify({ rules: [] })
    );

    const settings = anonymizationRulesSettingsStr
      ? (JSON.parse(anonymizationRulesSettingsStr) as AnonymizationSettings)
      : undefined;

    return {
      anonymizationEnabled: settings && settings.rules.some((rule) => rule.enabled),
    };
  }, [uiSettings]);
  const { euiTheme } = useEuiTheme();

  const stickyCalloutContainerClassName = css`
    position: sticky;
    top: 0;
    z-index: 1;
    background: ${euiTheme.colors.backgroundBasePlain};
    &:empty {
      display: none;
    }
  `;

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
      const { content, deanonymizations } = item.message.message;
      if (item.display.hide || !item) continue;

      if (anonymizationEnabled && content && deanonymizations) {
        item.anonymizedHighlightedContent = highlightContent(content, deanonymizations);
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
      <div className={stickyCalloutContainerClassName}>
        {showKnowledgeBaseReIndexingCallout ? <KnowledgeBaseReindexingCallout /> : null}
        {showElasticLlmCalloutInChat ? <ElasticLlmConversationCallout /> : null}
      </div>
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
