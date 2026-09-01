/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDraggable } from '@elastic/eui';

import type { ListConversationsResponseItem } from '../../../../../../../common/http_api/conversations';
import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { getConversationTemplateIcon } from '../../../../../hooks/use_conversation_template_display';
import { ConversationListItemRow } from './conversation_list_item_row';
import { deriveDisplayStatus } from './derive_display_status';

interface DraggableConversationItemProps {
  agentId: string;
  conversation: ListConversationsResponseItem;
  index: number;
  isActive: boolean;
  routeConversationId: string | undefined;
  onItemClick?: () => void;
}

export const DraggableConversationItem: React.FC<DraggableConversationItemProps> = ({
  agentId,
  conversation,
  index,
  isActive,
  routeConversationId,
  onItemClick,
}) => {
  const { activeStreams, byConversationId } = useStreamingContext();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const icon = getConversationTemplateIcon(conversationTemplatesService, conversation.template_id);
  const isStreaming = activeStreams.has(conversation.id);
  const hasError = Boolean(byConversationId[conversation.id]?.error);
  const status = deriveDisplayStatus(conversation, isStreaming, hasError, isActive);

  return (
    <EuiDraggable
      draggableId={conversation.id}
      index={index}
      spacing="none"
      isDragDisabled={isStreaming}
    >
      <ConversationListItemRow
        agentId={agentId}
        conversationId={conversation.id}
        title={conversation.title || conversation.id}
        isActive={isActive}
        routeConversationId={routeConversationId}
        showActionsMenu={!isStreaming}
        onItemClick={onItemClick}
        status={status}
        read={conversation.read}
        isPinned={conversation.pinned}
        permissions={conversation.permissions}
        icon={icon}
      />
    </EuiDraggable>
  );
};
