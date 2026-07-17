/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDraggable, EuiDroppable, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';

import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { ConversationListItemRow } from './conversation_list_item_row';
import { deriveDisplayStatus } from './derive_display_status';

const dragToPinLabel = i18n.translate('xpack.agentBuilder.sidebar.pinned.dragToPin', {
  defaultMessage: 'Drag a chat here to pin it',
});

interface PinnedConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  pinnedConversations: ConversationWithoutRounds[];
  isDropDisabled?: boolean;
  onItemClick?: () => void;
}

export const PinnedConversationList: React.FC<PinnedConversationListProps> = ({
  agentId,
  currentConversationId,
  pinnedConversations,
  isDropDisabled,
  onItemClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const { activeStreams, byConversationId } = useStreamingContext();

  const emptyDropTargetStyles = css`
    border: 1px dashed ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.small};
    padding: ${euiTheme.size.s};
    text-align: center;
    min-height: ${euiTheme.size.xxl};
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  if (pinnedConversations.length === 0) {
    return (
      <EuiDroppable
        droppableId="PINNED"
        spacing="none"
        grow={false}
        isDropDisabled={isDropDisabled}
      >
        <div css={emptyDropTargetStyles}>
          <EuiText size="xs" color="subdued">
            {dragToPinLabel}
          </EuiText>
        </div>
      </EuiDroppable>
    );
  }

  return (
    <EuiDroppable
      droppableId="PINNED"
      spacing="none"
      grow={false}
      isDropDisabled={isDropDisabled}
      style={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}
    >
      {pinnedConversations.map((conversation, index) => {
        const isActive = currentConversationId === conversation.id;
        const isStreaming = activeStreams.has(conversation.id);
        const hasError = Boolean(byConversationId[conversation.id]?.error);
        const status = deriveDisplayStatus(conversation, isStreaming, hasError, isActive);
        return (
          <EuiDraggable
            key={conversation.id}
            draggableId={conversation.id}
            index={index}
            spacing="none"
          >
            <ConversationListItemRow
              agentId={agentId}
              conversationId={conversation.id}
              title={conversation.title || conversation.id}
              isActive={isActive}
              routeConversationId={currentConversationId}
              showActionsMenu={!isStreaming}
              onItemClick={onItemClick}
              status={status}
              read={conversation.read}
            />
          </EuiDraggable>
        );
      })}
    </EuiDroppable>
  );
};
