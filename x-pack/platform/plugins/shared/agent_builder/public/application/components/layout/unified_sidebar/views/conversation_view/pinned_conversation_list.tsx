/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDroppable, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';

import { DROPPABLE_IDS } from './droppable_ids';
import { DraggableConversationItem } from './draggable_conversation_item';

const dragToPinLabel = i18n.translate('xpack.agentBuilder.sidebar.pinned.dragToPin', {
  defaultMessage: 'Drag a chat here to pin it',
});

interface PinnedConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  pinnedConversations: ConversationWithoutRounds[];
  isDropDisabled?: boolean;
  backgroundColor?: string;
  onItemClick?: () => void;
}

export const PinnedConversationList: React.FC<PinnedConversationListProps> = ({
  agentId,
  currentConversationId,
  pinnedConversations,
  isDropDisabled,
  backgroundColor = 'transparent',
  onItemClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDragActive = backgroundColor !== 'transparent';

  if (pinnedConversations.length === 0) {
    return (
      <EuiDroppable
        droppableId={DROPPABLE_IDS.PINNED}
        spacing="none"
        grow={false}
        isDropDisabled={isDropDisabled}
        style={{ backgroundColor: 'transparent' }}
      >
        <div
          css={css`
            border: 1px dashed
              ${isDragActive ? euiTheme.colors.borderBasePrimary : euiTheme.colors.borderBasePlain};
            border-radius: ${euiTheme.border.radius.small};
            padding: ${euiTheme.size.s};
            text-align: center;
            min-height: ${euiTheme.size.xxl};
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: ${backgroundColor};
            transition: background-color 0.15s, border-color 0.15s;
          `}
        >
          <EuiText size="xs" color="subdued">
            {dragToPinLabel}
          </EuiText>
        </div>
      </EuiDroppable>
    );
  }

  return (
    <EuiDroppable
      droppableId={DROPPABLE_IDS.PINNED}
      spacing="none"
      grow={false}
      isDropDisabled={isDropDisabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: euiTheme.size.xs,
        borderRadius: euiTheme.border.radius.small,
        backgroundColor,
        transition: 'background-color 0.15s',
      }}
    >
      {pinnedConversations.map((conversation, index) => (
        <DraggableConversationItem
          key={conversation.id}
          agentId={agentId}
          conversation={conversation}
          index={index}
          isActive={currentConversationId === conversation.id}
          routeConversationId={currentConversationId}
          onItemClick={onItemClick}
        />
      ))}
    </EuiDroppable>
  );
};
