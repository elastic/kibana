/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import React, { useCallback, useMemo, useState } from 'react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationList } from '../../../hooks/use_conversation_list';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { groupConversationsByTime } from '../../../utils/group_conversations';
import { NoConversationsPrompt } from './no_conversations_prompt';
import { DeleteConversationModal } from '../delete_conversation_modal';

const EMPTY_CONTAINER_HEIGHT = 300;

const ROW_HEIGHT = 32;
const MAX_ROWS = 18;
const MAX_LIST_HEIGHT = ROW_HEIGHT * MAX_ROWS;

const emptyContainerStyles = css`
  height: ${EMPTY_CONTAINER_HEIGHT}px;
  justify-content: center;
  align-items: center;
`;

const deleteConversationLabel = (title: string) =>
  i18n.translate('xpack.agentBuilder.conversationsHistory.deleteConversation', {
    defaultMessage: 'Delete conversation {title}',
    values: { title },
  });

interface ConversationHistoryListProps {
  onClose?: () => void;
}

export const ConversationHistoryList: React.FC<ConversationHistoryListProps> = ({ onClose }) => {
  const { conversations = [], isLoading } = useConversationList();
  const currentConversationId = useConversationId();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const { euiTheme } = useEuiTheme();
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationWithoutRounds | null>(null);

  const timeSections = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }
    return groupConversationsByTime(conversations);
  }, [conversations]);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const options: EuiSelectableOption[] = [];

    timeSections.forEach(({ label, conversations: sectionConversations }) => {
      // Add group label
      options.push({
        label,
        isGroupLabel: true,
      });

      // Add conversation options
      sectionConversations.forEach((conversation) => {
        options.push({
          key: conversation.id,
          label: conversation.title,
          checked: currentConversationId === conversation.id ? 'on' : undefined,
          'data-test-subj': `conversationItem-${conversation.id}`,
          append: (
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={deleteConversationLabel(conversation.title)}
              onClick={(event: React.MouseEvent) => {
                // Must stop click event from propagating to list item which would trigger navigation
                event.stopPropagation();
                setConversationToDelete(conversation);
              }}
              data-test-subj={`deleteConversationButton-${conversation.id}`}
            />
          ),
          data: {
            conversation,
          },
        });
      });
    });

    return options;
  }, [timeSections, currentConversationId]);

  const handleChange = useCallback(
    (_options: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      if (!changedOption?.data?.conversation) return;

      const conversation = changedOption.data.conversation as ConversationWithoutRounds;

      if (isEmbeddedContext) {
        setConversationId?.(conversation.id);
      } else {
        navigateToAgentBuilderUrl(appPaths.chat.conversation({ conversationId: conversation.id }));
      }
      onClose?.();
    },
    [isEmbeddedContext, onClose, setConversationId, navigateToAgentBuilderUrl]
  );

  if (isLoading) {
    return (
      <EuiFlexItem css={emptyContainerStyles}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
    );
  }

  if (timeSections.length === 0) {
    return (
      <EuiFlexItem css={emptyContainerStyles}>
        <NoConversationsPrompt />
      </EuiFlexItem>
    );
  }

  // remove borders from list items and group labels
  const listStylesOverride = css`
    .euiSelectableListItem:not(:last-of-type) {
      border-block-end: 0;
    }
    .euiSelectableList__groupLabel {
      border-block-end: 0;
      :not(:first-of-type) {
        padding-block-start: ${euiTheme.size.m};
      }
    }
    /* Only show append icon on hover or focus */
    .euiSelectableListItem__append {
      opacity: 0;
    }
    .euiSelectableListItem:hover .euiSelectableListItem__append,
    .euiSelectableListItem-isFocused .euiSelectableListItem__append {
      opacity: 1;
    }
  `;

  const listItemsHeight = selectableOptions.length * ROW_HEIGHT;
  // Calculate height based on item count, capped at max rows
  const listHeight = Math.min(listItemsHeight, MAX_LIST_HEIGHT);

  return (
    <>
      <EuiSelectable
        height={listHeight}
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.agentBuilder.conversationsHistory.searchPlaceholder', {
            defaultMessage: 'Search conversations',
          }),
          compressed: true,
          inputRef: (node) => {
            node?.focus();
          },
        }}
        options={selectableOptions}
        onChange={handleChange}
        singleSelection={true}
        aria-label={i18n.translate('xpack.agentBuilder.conversationsHistory.conversations', {
          defaultMessage: 'Conversations',
        })}
        data-test-subj="agentBuilderConversationList"
        listProps={{
          bordered: false,
          showIcons: false,
          onFocusBadge: false,
        }}
        css={listStylesOverride}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
      <DeleteConversationModal
        isOpen={conversationToDelete !== null}
        onClose={() => {
          setConversationToDelete(null);
        }}
        conversation={conversationToDelete ?? undefined}
      />
    </>
  );
};
