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
import { isEmpty } from 'lodash';
import { Conversation } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { useConversation } from '../../use_conversation';
import * as i18n from './translations';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  currentConversation: Conversation;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  shouldDisableKeyboardShortcut?: () => boolean;
  isDisabled?: boolean;
  conversations: Record<string, Conversation>;
}

const getPreviousConversationId = (conversationIds: string[], selectedConversationId: string) => {
  return conversationIds.indexOf(selectedConversationId) === 0
    ? conversationIds[conversationIds.length - 1]
    : conversationIds[conversationIds.indexOf(selectedConversationId) - 1];
};

const getNextConversationId = (conversationIds: string[], selectedConversationId: string) => {
  return conversationIds.indexOf(selectedConversationId) + 1 >= conversationIds.length
    ? conversationIds[0]
    : conversationIds[conversationIds.indexOf(selectedConversationId) + 1];
};

export type ConversationSelectorOption = EuiComboBoxOptionOption<{
  isDefault: boolean;
}>;

export const ConversationSidePanel: React.FC<Props> = React.memo(
  ({
    currentConversation,
    onConversationSelected,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
    conversations,
  }) => {
    const { deleteConversation, createConversation } = useConversation();
    const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);

    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (cId: string) => {
        if (currentConversation.id === cId) {
          const previousConversation =
            conversations[getPreviousConversationId(conversationIds, cId)];
          onConversationSelected({
            cId: previousConversation.id,
            cTitle: previousConversation.title,
          });
        }
        setTimeout(() => {
          deleteConversation(cId);
        }, 0);
      },
      [
        currentConversation,
        conversations,
        conversationIds,
        onConversationSelected,
        deleteConversation,
      ]
    );

    const onLeftArrowClick = useCallback(() => {
      const previousConversation =
        conversations[getPreviousConversationId(conversationIds, currentConversation.id)];
      onConversationSelected({
        cId: previousConversation.id,
        cTitle: previousConversation.title,
      });
    }, [conversations, conversationIds, deleteConversationId, onConversationSelected]);
    const onRightArrowClick = useCallback(() => {
      const nextConversation =
        conversations[getNextConversationId(conversationIds, currentConversation.id)];
      onConversationSelected({
        cId: nextConversation.id,
        cTitle: nextConversation.title,
      });
    }, [conversations, conversationIds, currentConversation.id, onConversationSelected]);

    // Register keyboard listener for quick conversation switching
    const onKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (isDisabled || conversationIds.length <= 1) {
          return;
        }

        if (
          event.key === 'ArrowLeft' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onLeftArrowClick();
        }
        if (
          event.key === 'ArrowRight' &&
          (isMac ? event.metaKey : event.ctrlKey) &&
          !shouldDisableKeyboardShortcut()
        ) {
          event.preventDefault();
          onRightArrowClick();
        }
      },
      [
        conversationIds.length,
        isDisabled,
        onLeftArrowClick,
        onRightArrowClick,
        shouldDisableKeyboardShortcut,
      ]
    );

    const onSubmit = useCallback(() => {
      createConversation({
        title: 'New chat',
        apiConfig: currentConversation.apiConfig,
      }).then((newConversation) => {
        if (newConversation) {
          onConversationSelected({
            cId: newConversation.id,
            cTitle: newConversation.title,
          });
        }
      });
    }, [createConversation, currentConversation.apiConfig, onConversationSelected]);

    const handleCloseModal = useCallback(() => {
      setDeleteConversationId(null);
    }, []);

    const handleDelete = useCallback(() => {
      if (deleteConversationId) {
        setDeleteConversationId(null);
        onDelete(deleteConversationId);
      }
    }, [deleteConversationId, onDelete]);

    useEvent('keydown', onKeyDown);

    console.error('conversations', conversations, currentConversation);

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
                {Object.values(conversations)
                  .reverse()
                  .map((conversation) => (
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
                        onClick: () => setDeleteConversationId(conversation.id),
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
        {deleteConversationId && (
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
