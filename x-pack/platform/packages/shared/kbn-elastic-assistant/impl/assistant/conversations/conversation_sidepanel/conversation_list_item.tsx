/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiListGroupItem } from '@elastic/eui';
import { ConversationWithOwner } from '../../api';
import { Conversation } from '../../../..';
import { ConversationSidePanelContextMenu } from './context_menu';
import { COPY_URL, DUPLICATE } from '../../use_conversation/translations';
import * as i18n from './translations';

interface Props {
  conversation: ConversationWithOwner;
  handleCopyUrl: (conversation: Conversation) => Promise<void>;
  handleDuplicateConversation: (conversation: Conversation) => Promise<void>;
  isActiveConversation: boolean;
  lastConversationId: string;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  setDeleteConversationItem: React.Dispatch<React.SetStateAction<Conversation | null>>;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

export const ConversationListItem: FunctionComponent<Props> = ({
  conversation,
  handleCopyUrl,
  handleDuplicateConversation,
  isActiveConversation,
  lastConversationId,
  onConversationSelected,
  setDeleteConversationItem,
  setPaginationObserver,
}) => {
  const internalSetObserver = (ref: HTMLDivElement | null) => {
    if (conversation.id === lastConversationId && ref) {
      setPaginationObserver(ref);
    }
  };

  const handleConversationClick = useCallback(
    () =>
      onConversationSelected({
        cId: conversation.id,
      }),
    [conversation.id, onConversationSelected]
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
              flex-direction: row-reverse;
            }
          `}
          label={conversation.title}
          iconType={conversation.users.length !== 1 ? 'users' : undefined}
          iconProps={{
            size: 's',
            css: css`
              margin-inline-start: 12px;
              margin-inline-end: 0px;
            `,
            color: conversation.isConversationOwner ? 'accent' : 'default',
          }}
          data-test-subj={`conversation-select-${conversation.title}`}
          isActive={isActiveConversation}
        />
        <ConversationSidePanelContextMenu
          label={'context menu for converstion'}
          actions={[
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
            {
              key: 'delete',
              children: i18n.DELETE_CONVERSATION,
              onClick: () => setDeleteConversationItem(conversation),
              icon: 'trash',
            },
          ]}
        />
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
