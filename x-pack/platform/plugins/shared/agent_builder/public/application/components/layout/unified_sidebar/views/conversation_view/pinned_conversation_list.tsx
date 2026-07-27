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
  onItemClick?: (id: string) => void;
  isDragging?: boolean;
}

export const PinnedConversationList: React.FC<PinnedConversationListProps> = ({
  agentId,
  currentConversationId,
  pinnedConversations,
  isDropDisabled,
  backgroundColor = 'transparent',
  onItemClick,
  isDragging = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const isEmpty = pinnedConversations.length === 0;
  const showOverlay = isDragging && !isEmpty;

  const placeholderLabel = (
    <EuiText size="xs" color="subdued">
      {dragToPinLabel}
    </EuiText>
  );

  const sharedPlaceholderCss = css`
    border-radius: ${euiTheme.border.radius.small};
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  return (
    <div style={{ position: 'relative' }}>
      <EuiDroppable
        droppableId={DROPPABLE_IDS.PINNED}
        spacing="none"
        grow={false}
        isDropDisabled={isDropDisabled}
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${isEmpty ? 0 : euiTheme.size.xs};
          border-radius: ${euiTheme.border.radius.small};
          background-color: ${isEmpty ? 'transparent' : backgroundColor};
          transition: background-color 0.15s;
          & > [data-rfd-placeholder-context-id] {
            display: none !important;
          }
        `}
      >
        <>
          {isEmpty && (
            <div
              css={[
                sharedPlaceholderCss,
                css`
                  border: 1px dashed
                    ${isDragging
                      ? euiTheme.colors.borderBasePrimary
                      : euiTheme.colors.borderBasePlain};
                  padding: ${euiTheme.size.s};
                  text-align: center;
                  min-height: ${euiTheme.size.xxl};
                  background-color: ${isDragging ? backgroundColor : 'transparent'};
                  transition: background-color 0.15s, border-color 0.15s;
                `,
              ]}
            >
              {placeholderLabel}
            </div>
          )}
          {pinnedConversations.map((conversation, index) => (
            <DraggableConversationItem
              key={conversation.id}
              agentId={agentId}
              conversation={conversation}
              index={index}
              isActive={currentConversationId === conversation.id}
              routeConversationId={currentConversationId}
              onItemClick={onItemClick ? () => onItemClick(conversation.id) : undefined}
            />
          ))}
        </>
      </EuiDroppable>

      {showOverlay && (
        <div
          css={[
            sharedPlaceholderCss,
            css`
              position: absolute;
              inset: 0;
              pointer-events: none;
              border: 1px dashed ${euiTheme.colors.borderBasePrimary};
              background-color: ${backgroundColor};
              transition: background-color 0.15s;
            `,
          ]}
        >
          {placeholderLabel}
        </div>
      )}
    </div>
  );
};
