/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopoverTitle,
  EuiSelectable,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import React, { useCallback, useMemo } from 'react';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { groupConversationsByTime } from '../../../utils/group_conversations';
import { NoConversationsPrompt } from './no_conversations_prompt';
import { useConversationList } from '../../../hooks/use_conversation_list';

const EMPTY_CONTAINER_HEIGHT = 300;

const emptyContainerStyles = css`
  height: ${EMPTY_CONTAINER_HEIGHT}px;
  justify-content: center;
  align-items: center;
`;

interface ConversationHistoryListProps {
  onClose?: () => void;
}

export const ConversationHistoryList: React.FC<ConversationHistoryListProps> = ({ onClose }) => {
  const { conversations = [], isLoading } = useConversationList();
  const currentConversationId = useConversationId();
  const { navigateToOnechatUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const { euiTheme } = useEuiTheme();

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
          data: {
            conversation,
          },
        });
      });
    });

    return options;
  }, [timeSections, currentConversationId]);

  const handleChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedOption = options.find(
        (option) => option.checked === 'on' && !option.isGroupLabel
      );
      if (!selectedOption?.data?.conversation) return;

      const conversation = selectedOption.data.conversation as ConversationWithoutRounds;

      if (isEmbeddedContext) {
        setConversationId?.(conversation.id);
      } else {
        navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: conversation.id }));
      }
      onClose?.();
    },
    [isEmbeddedContext, onClose, setConversationId, navigateToOnechatUrl]
  );

  const selectableStyles = css`
    .euiSelectableList__groupLabel {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

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

  return (
    <EuiSelectable
      css={selectableStyles}
      searchable
      searchProps={{
        placeholder: i18n.translate('xpack.onechat.conversationsHistory.searchPlaceholder', {
          defaultMessage: 'Search conversations',
        }),
        compressed: true,
      }}
      options={selectableOptions}
      onChange={handleChange}
      singleSelection={true}
      aria-label={i18n.translate('xpack.onechat.conversationsHistory.conversations', {
        defaultMessage: 'Conversations',
      })}
      data-test-subj="agentBuilderConversationList"
    >
      {(list, search) => (
        <div>
          <PopoverHeader />
          <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
          {list}
        </div>
      )}
    </EuiSelectable>
  );
};

const PopoverHeader = () => {
  const { euiTheme } = useEuiTheme();

  const headerStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-bottom: 1px solid ${euiTheme.border.color};
  `;

  return (
    <div css={headerStyles}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.onechat.conversationsHistory.title', {
                defaultMessage: 'Conversations',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
