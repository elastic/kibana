/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiConfirmModal,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';

import { css } from '@emotion/react';
import { isEmpty, findIndex } from 'lodash';
import { Conversation } from '../../../..';
import { useConversation } from '../../use_conversation';
import * as i18n from './translations';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  currentConversation: Conversation;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  shouldDisableKeyboardShortcut?: () => boolean;
  isDisabled?: boolean;
  conversations: Record<string, Conversation>;
  onConversationDeleted: (conversationId: string) => void;
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
  currentConversation: Conversation
) => {
  const conversationIndex = getCurrentConversationIndex(conversationList, currentConversation);

  return !conversationIndex
    ? conversationList[conversationList.length - 1]
    : conversationList[conversationIndex - 1];
};

const getNextConversation = (
  conversationList: Conversation[],
  currentConversation: Conversation
) => {
  const conversationIndex = getCurrentConversationIndex(conversationList, currentConversation);

  return conversationIndex >= conversationList.length - 1
    ? conversationList[0]
    : conversationList[conversationIndex + 1];
};

export type ConversationSelectorOption = EuiComboBoxOptionOption<{
  isDefault: boolean;
}>;

export const ConversationSidePanel = React.memo<Props>(
  ({
    currentConversation,
    onConversationSelected,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
    conversations,
    onConversationDeleted,
  }) => {
    const { createConversation } = useConversation();
    const [deleteConversationItem, setDeleteConversationItem] = useState<Conversation | null>(null);

    const conversationList = useMemo(() => Object.values(conversations).reverse(), [conversations]);

    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (conversation: Conversation) => {
        if (currentConversation.id === conversation.id) {
          const previousConversation = getNextConversation(conversationList, conversation);
          onConversationSelected({
            cId: previousConversation.id,
            cTitle: previousConversation.title,
          });
        }
        onConversationDeleted(conversation.title);
      },
      [currentConversation.id, onConversationDeleted, conversationList, onConversationSelected]
    );

    const onArrowUpClick = useCallback(() => {
      const previousConversation = getPreviousConversation(conversationList, currentConversation);

      onConversationSelected({
        cId: previousConversation.id,
        cTitle: previousConversation.title,
      });
    }, [conversationList, currentConversation, onConversationSelected]);
    const onArrowDownClick = useCallback(() => {
      const nextConversation = getNextConversation(conversationList, currentConversation);
      onConversationSelected({
        cId: nextConversation.id,
        cTitle: nextConversation.title,
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

    const onSubmit = useCallback(() => {
      if (conversations[i18n.NEW_CHAT]) {
        onConversationSelected({
          cId: conversations[i18n.NEW_CHAT].id,
          cTitle: conversations[i18n.NEW_CHAT].title,
        });
        return;
      }

      createConversation({
        title: i18n.NEW_CHAT,
        apiConfig: currentConversation.apiConfig,
      }).then((newConversation) => {
        if (newConversation) {
          onConversationSelected({
            cId: newConversation.id,
            cTitle: newConversation.title,
          });
        }
      });
    }, [conversations, createConversation, currentConversation.apiConfig, onConversationSelected]);

    const handleCloseModal = useCallback(() => {
      setDeleteConversationItem(null);
    }, []);

    const handleDelete = useCallback(() => {
      if (deleteConversationItem) {
        setDeleteConversationItem(null);
        onDelete(deleteConversationItem);
      }
    }, [deleteConversationItem, onDelete]);

    useEvent('keydown', onKeyDown);

    return (
      <>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel hasShadow={false} borderRadius="none">
              <EuiListGroup
                size="xs"
                css={css`
                  padding: 0;
                `}
              >
                {conversationList.map((conversation) => (
                  <EuiListGroupItem
                    key={conversation.id + conversation.title}
                    onClick={() =>
                      onConversationSelected({ cId: conversation.id, cTitle: conversation.title })
                    }
                    label={conversation.title}
                    isActive={
                      !isEmpty(conversation.id)
                        ? conversation.id === currentConversation.id
                        : conversation.title === currentConversation.title
                    }
                    extraAction={{
                      color: 'danger',
                      onClick: () => setDeleteConversationItem(conversation),
                      iconType: 'trash',
                      iconSize: 's',
                      disabled: conversation.isDefault,
                      'aria-label': i18n.DELETE_CONVERSATION_ARIA_LABEL,
                      'data-test-subj': 'delete-option',
                    }}
                  />
                ))}
              </EuiListGroup>
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
                onClick={onSubmit}
                fullWidth
                size="s"
              >
                {i18n.NEW_CHAT}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        {deleteConversationItem && (
          <EuiConfirmModal
            title={i18n.DELETE_CONVERSATION_TITLE}
            onCancel={handleCloseModal}
            onConfirm={handleDelete}
            cancelButtonText={i18n.CANCEL_BUTTON_TEXT}
            confirmButtonText={i18n.DELETE_BUTTON_TEXT}
            buttonColor="danger"
            defaultFocusedButton="confirm"
          />
        )}
      </>
    );
  }
);

ConversationSidePanel.displayName = 'ConversationSidePanel';
