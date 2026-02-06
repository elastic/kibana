/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiListGroup,
  EuiPanel,
  EuiText,
  EuiSpacer,
  useEuiTheme,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';

import { css } from '@emotion/react';
import { isEmpty, findIndex } from 'lodash';
import type { User } from '@kbn/elastic-assistant-common';
import { isMac } from '@kbn/shared-ux-utility';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { ConversationListItem } from './conversation_list_item';
import { useConversation } from '../../use_conversation';
import type { ConversationWithOwner } from '../../api';
import { useConversationsByDate } from './use_conversations_by_date';
import type { DataStreamApis } from '../../use_data_stream_apis';
import type { Conversation } from '../../../..';
import * as i18n from './translations';

interface Props {
  currentConversation?: Conversation;
  currentUser?: User;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  shouldDisableKeyboardShortcut?: () => boolean;
  isDisabled?: boolean;
  isFetchingCurrentUserConversations: boolean;
  conversations: Record<string, ConversationWithOwner>;
  onConversationDeleted: (conversationId: string) => void;
  onConversationCreate: () => void;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

const getCurrentConversationIndex = (
  conversationList: Conversation[],
  currentConversation: Conversation
) =>
  findIndex(conversationList, (c) =>
    !isEmpty(c.id) ? c.id === currentConversation?.id : c.title === currentConversation?.title
  );

const getPreviousConversation = (
  conversationList: Conversation[],
  currentConversation?: Conversation
) => {
  const conversationIndex = currentConversation
    ? getCurrentConversationIndex(conversationList, currentConversation)
    : 0;

  return !conversationIndex
    ? conversationList[conversationList.length - 1]
    : conversationList[conversationIndex - 1];
};

const getNextConversation = (
  conversationList: Conversation[],
  currentConversation?: Conversation
) => {
  const conversationIndex = currentConversation
    ? getCurrentConversationIndex(conversationList, currentConversation)
    : 0;

  return conversationIndex >= conversationList.length - 1
    ? conversationList[0]
    : conversationList[conversationIndex + 1];
};
export const ConversationSidePanel = React.memo<Props>(
  ({
    currentConversation,
    currentUser,
    onConversationSelected,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
    isFetchingCurrentUserConversations,
    conversations,
    onConversationDeleted,
    onConversationCreate,
    refetchCurrentUserConversations,
    setCurrentConversation,
    setPaginationObserver,
  }) => {
    const euiTheme = useEuiTheme();

    const titleClassName = css`
      text-transform: uppercase;
      font-weight: ${euiTheme.euiTheme.font.weight.bold};
    `;
    const [deleteConversationItem, setDeleteConversationItem] = useState<Conversation | null>(null);

    const { copyConversationUrl, duplicateConversation } = useConversation();
    const conversationsCategorizedByDate = useConversationsByDate(Object.values(conversations));

    const conversationList = useMemo(
      () => Object.values(conversationsCategorizedByDate).flatMap((p) => p),
      [conversationsCategorizedByDate]
    );

    const lastConversationId = conversationList[conversationList.length - 1]?.id;

    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);

    const onArrowUpClick = useCallback(() => {
      const previousConversation = getPreviousConversation(conversationList, currentConversation);

      onConversationSelected({
        cId: previousConversation.id,
      });
    }, [conversationList, currentConversation, onConversationSelected]);
    const onArrowDownClick = useCallback(() => {
      const nextConversation = getNextConversation(conversationList, currentConversation);
      onConversationSelected({
        cId: nextConversation.id,
      });
    }, [conversationList, currentConversation, onConversationSelected]);

    // Register keyboard listener for quick conversation switching
    const onKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (isDisabled || conversationIds.length <= 1) {
          return;
        }

        if (
          event.key === 'ArrowUp' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onArrowUpClick();
        }
        if (
          event.key === 'ArrowDown' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onArrowDownClick();
        }
      },
      [
        conversationIds.length,
        isDisabled,
        onArrowUpClick,
        onArrowDownClick,
        shouldDisableKeyboardShortcut,
      ]
    );

    const handleDuplicateConversation = useCallback(
      (conversation?: Conversation) =>
        duplicateConversation({
          refetchCurrentUserConversations,
          selectedConversation: conversation,
          setCurrentConversation,
        }),
      [duplicateConversation, refetchCurrentUserConversations, setCurrentConversation]
    );

    const handleCopyUrl = useCallback(
      (conversation?: Conversation) => copyConversationUrl(conversation),
      [copyConversationUrl]
    );

    const memoizedConversationList = useMemo(
      () =>
        Object.entries(conversationsCategorizedByDate).map(([category, convoList]) =>
          convoList.length ? (
            <EuiFlexItem grow={false} key={category}>
              <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                <EuiText css={titleClassName} size="s">
                  {i18n.DATE_CATEGORY_LABELS[category]}
                </EuiText>
              </EuiPanel>
              <EuiListGroup
                size="xs"
                css={css`
                  padding: 0;
                `}
              >
                {convoList.map((conversation) => (
                  <ConversationListItem
                    conversation={conversation}
                    currentUser={currentUser}
                    isActiveConversation={
                      !isEmpty(conversation.id)
                        ? conversation.id === currentConversation?.id
                        : conversation.title === currentConversation?.title
                    }
                    key={conversation.id}
                    handleDuplicateConversation={handleDuplicateConversation}
                    handleCopyUrl={handleCopyUrl}
                    lastConversationId={lastConversationId}
                    onConversationSelected={onConversationSelected}
                    setDeleteConversationItem={setDeleteConversationItem}
                    setPaginationObserver={setPaginationObserver}
                  />
                ))}
              </EuiListGroup>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          ) : null
        ),
      [
        conversationsCategorizedByDate,
        currentConversation?.id,
        currentConversation?.title,
        currentUser,
        handleCopyUrl,
        handleDuplicateConversation,
        lastConversationId,
        onConversationSelected,
        setPaginationObserver,
        titleClassName,
      ]
    );

    useEvent('keydown', onKeyDown);
    return (
      <>
        <EuiFlexGroup
          direction="column"
          justifyContent="spaceBetween"
          gutterSize="none"
          css={css`
            overflow: hidden;
          `}
        >
          <EuiFlexItem
            css={css`
              overflow: auto;
            `}
          >
            <EuiPanel
              hasShadow={false}
              borderRadius="none"
              data-test-subj={'conversationSidePanel'}
            >
              {memoizedConversationList}
              {isFetchingCurrentUserConversations && (
                <EuiLoadingSpinner
                  size="m"
                  css={css`
                    display: block;
                    margin: 0 auto;
                  `}
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel
              hasShadow={false}
              hasBorder
              borderRadius="none"
              paddingSize="m"
              css={css`
                border-left: 0;
                border-right: 0;
                border-bottom: 0;
                padding-top: 12px;
                padding-bottom: 12px;
              `}
            >
              <EuiButton
                color="primary"
                fill
                iconType="discuss"
                onClick={onConversationCreate}
                fullWidth
                size="s"
              >
                {i18n.NEW_CHAT}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DeleteConversationModal
          conversationList={conversationList}
          currentConversationId={currentConversation?.id}
          deleteConversationItem={deleteConversationItem}
          onConversationDeleted={onConversationDeleted}
          onConversationSelected={onConversationSelected}
          setDeleteConversationItem={setDeleteConversationItem}
        />
      </>
    );
  }
);

ConversationSidePanel.displayName = 'ConversationSidePanel';
