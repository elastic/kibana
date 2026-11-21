/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { RelativeTime } from '../shared';
import * as i18n from './translations';

export interface ThreadsMenuProps {
  record: InvestigationRecord;
  /** The conversation currently shown. */
  selectedConversationId: string;
  onSelect: (conversationId: string) => void;
  onNewThread: () => void;
  /** New threads need Agent Builder, so the action is hidden without it. */
  canCreateThread: boolean;
}

const MENU_WIDTH = '22rem';

/** A button with the thread count that lists the main conversation and the threads. */
export const ThreadsMenu: React.FC<ThreadsMenuProps> = ({
  record,
  selectedConversationId,
  onSelect,
  onNewThread,
  canCreateThread,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { threads, conversation_id: mainConversationId } = record;

  const select = (conversationId: string) => {
    setIsOpen(false);
    onSelect(conversationId);
  };

  const mainItem = mainConversationId ? (
    <EuiContextMenuItem
      key={mainConversationId}
      icon={ICONS.conversation}
      onClick={() => select(mainConversationId)}
      aria-current={selectedConversationId === mainConversationId}
      css={
        selectedConversationId === mainConversationId
          ? css`
              background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
            `
          : undefined
      }
      data-test-subj="investigationThreadsMenuMain"
    >
      <strong>{i18n.MAIN_CONVERSATION}</strong>
    </EuiContextMenuItem>
  ) : null;

  const threadItems = threads.map((thread) => {
    const isSelected = thread.conversation_id === selectedConversationId;
    return (
      <EuiContextMenuItem
        key={thread.conversation_id}
        icon={ICONS.thread}
        onClick={() => select(thread.conversation_id)}
        aria-current={isSelected}
        css={
          isSelected
            ? css`
                background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
              `
            : undefined
        }
        data-test-subj="investigationThreadsMenuItem"
      >
        <EuiText size="s">
          <strong>{thread.title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {thread.anchor ? `${i18n.THREAD_ANCHOR(thread.anchor)} · ` : ''}
          {i18n.THREAD_META(thread.created_by.name)}
          {' · '}
          <RelativeTime value={thread.created_at} />
        </EuiText>
      </EuiContextMenuItem>
    );
  });

  const items = [
    ...(mainItem ? [mainItem] : []),
    ...threadItems,
    ...(threads.length === 0
      ? [
          <EuiContextMenuItem key="empty" disabled data-test-subj="investigationThreadsMenuEmpty">
            {i18n.NO_THREADS}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(canCreateThread
      ? [
          <EuiContextMenuItem
            key="new"
            icon={ICONS.add}
            onClick={() => {
              setIsOpen(false);
              onNewThread();
            }}
            data-test-subj="investigationThreadsMenuNew"
          >
            {i18n.NEW_THREAD}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      aria-label={i18n.THREADS}
      panelPaddingSize="none"
      button={
        <EuiButton
          size="s"
          iconType={ICONS.thread}
          aria-label={i18n.THREADS_COUNT(threads.length)}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="investigationThreadsButton"
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{i18n.THREADS}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued" data-test-subj="investigationThreadsCount">
                {threads.length}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>
      }
    >
      <div
        css={css`
          inline-size: ${MENU_WIDTH};
          max-inline-size: 90vw;
          max-block-size: 60vh;
          overflow-y: auto;
        `}
      >
        <EuiContextMenuPanel items={items} data-test-subj="investigationThreadsMenu" />
      </div>
    </EuiPopover>
  );
};
ThreadsMenu.displayName = 'ThreadsMenu';
