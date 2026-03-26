/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiListGroupItem } from '@elastic/eui';
import {
  ConversationSharedState,
  getConversationSharedState,
  type User,
} from '@kbn/elastic-assistant-common';
import { getSharedIcon } from '../../share_conversation/utils';

import type { ConversationWithOwner } from '../../api';
import type { Conversation } from '../../../..';
import { ConversationSidePanelContextMenu } from './context_menu';
import { COPY_URL, DUPLICATE } from '../../use_conversation/translations';
import * as i18n from './translations';

interface Props {
  conversation: ConversationWithOwner;
  currentUser?: User;
  handleCopyUrl: (conversation: Conversation) => Promise<void>;
  handleDuplicateConversation: (conversation: Conversation) => Promise<void>;
  isActiveConversation: boolean;
  lastConversationId: string;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  setDeleteConversationItem: React.Dispatch<React.SetStateAction<Conversation | null>>;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

export const ConversationListItem: React.FC<Props> = ({
  conversation,
  currentUser,
  handleCopyUrl,
  handleDuplicateConversation,
  isActiveConversation,
  lastConversationId,
  onConversationSelected,
  setDeleteConversationItem,
  setPaginationObserver,
}) => {
  const internalSetObserver = useCallback(
    (ref: HTMLDivElement | null) => {
      if (conversation.id === lastConversationId && ref) {
        setPaginationObserver(ref);
      }
    },
    [conversation.id, lastConversationId, setPaginationObserver]
  );

  const handleConversationClick = useCallback(
    () =>
      onConversationSelected({
        cId: conversation.id,
      }),
    [conversation.id, onConversationSelected]
  );

  const conversationSharedState = useMemo(
    () => getConversationSharedState(conversation),
    [conversation]
  );

  const shouldShowIcon = useMemo(
    () => conversationSharedState !== ConversationSharedState.PRIVATE && !!currentUser,
    [conversationSharedState, currentUser]
  );
  const { iconType, iconTitle } = useMemo(
    () =>
      conversation.isConversationOwner
        ? {
            iconType: shouldShowIcon ? getSharedIcon(conversationSharedState) : undefined,
            iconTitle: i18n.SHARED_BY_YOU,
          }
        : {
            iconType: shouldShowIcon ? getSharedIcon(conversationSharedState) : undefined,
            iconTitle: i18n.SHARED_WITH_YOU,
          },
    [conversation.isConversationOwner, shouldShowIcon, conversationSharedState]
  );

  const actions = useMemo(
    () => [
      {
        key: 'copy',
        children: COPY_URL,
        onClick: () => handleCopyUrl(conversation),
        icon: 'link',
      },
      {
        key: 'duplicate',
        children: DUPLICATE,
        onClick: () => handleDuplicateConversation(conversation),
        icon: 'copy',
      },
      ...(conversation.isConversationOwner
        ? [
            {
              key: 'delete',
              children: i18n.DELETE_CONVERSATION,
              onClick: () => setDeleteConversationItem(conversation),
              icon: 'trash',
            },
          ]
        : []),
    ],
    [handleCopyUrl, handleDuplicateConversation, setDeleteConversationItem, conversation]
  );

  return (
    <span key={conversation.id + conversation.title}>
      <EuiFlexGroup gutterSize="xs">
        <EuiListGroupItem
          size="xs"
          onClick={handleConversationClick}
          className="eui-textTruncate"
          css={css`
            flex: 1;
            .euiListGroupItem__button {
              // forces the icon to be on the right side of the text
              flex-direction: ${shouldShowIcon ? 'row-reverse' : 'row'};
              justify-content: space-between;
            }
          `}
          label={conversation.title}
          iconType={iconType}
          iconProps={{
            'data-test-subj': `conversation-icon-${conversation.title}`,
            size: 's',
            title: iconTitle,
            css: css`
              margin-inline-start: 12px;
              margin-inline-end: 0px;
            `,
          }}
          data-test-subj={`conversation-select-${conversation.title}`}
          isActive={isActiveConversation}
        />
        <ConversationSidePanelContextMenu actions={actions} />
      </EuiFlexGroup>
      {/* Observer element for infinite scrolling pagination of conversations */}
      {conversation.id === lastConversationId && (
        <div
          ref={internalSetObserver}
          css={css`
            height: 1px;
          `}
        />
      )}
    </span>
  );
};
