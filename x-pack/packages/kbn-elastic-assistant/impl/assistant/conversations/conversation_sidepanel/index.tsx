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
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { FormProvider, useForm } from 'react-hook-form';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Conversation } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { useConversation } from '../../use_conversation';
import { TitleField } from './title_field';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  selectedConversationId: string | undefined;
  onConversationSelected: (conversationId: string) => void;
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
    selectedConversationId = DEFAULT_CONVERSATION_TITLE,
    onConversationSelected,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
    conversations,
  }) => {
    const { deleteConversation, createConversation } = useConversation();

    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (cId: string) => {
        if (selectedConversationId === cId) {
          onConversationSelected(getPreviousConversationId(conversationIds, cId));
        }
        setTimeout(() => {
          deleteConversation(cId);
        }, 0);
      },
      [conversationIds, deleteConversation, selectedConversationId, onConversationSelected]
    );

    const onLeftArrowClick = useCallback(() => {
      const prevId = getPreviousConversationId(conversationIds, selectedConversationId);
      onConversationSelected(prevId);
    }, [conversationIds, selectedConversationId, onConversationSelected]);
    const onRightArrowClick = useCallback(() => {
      const nextId = getNextConversationId(conversationIds, selectedConversationId);
      onConversationSelected(nextId);
    }, [conversationIds, selectedConversationId, onConversationSelected]);

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

    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => {
      setIsModalVisible(true);
    };

    const closeModal = () => {
      setIsModalVisible(false);
    };

    useEvent('keydown', onKeyDown);

    const hookFormMethods = useForm({
      defaultValues: {
        title: '',
      },
    });

    const onSubmit = useCallback(
      (data) => {
        createConversation({ conversationId: data.title });
        onConversationSelected(data.title);
        closeModal();
      },
      [createConversation, onConversationSelected]
    );

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
                {Object.values(conversations).map((conversation) => (
                  <EuiListGroupItem
                    key={conversation.id}
                    onClick={() => onConversationSelected(conversation.id)}
                    label={conversation.id}
                    isActive={conversation.id === selectedConversationId}
                    extraAction={{
                      color: 'danger',
                      onClick: () => onDelete(conversation.id),
                      iconType: 'trash',
                      iconSize: 's',
                      disabled: conversation.isDefault,
                      'aria-label': i18n.translate(
                        'xpack.elasticAssistant.assistant.conversations.sidePanel.deleteAriaLabel',
                        {
                          defaultMessage: 'Delete conversation',
                        }
                      ),
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
                onClick={showModal}
                fullWidth
                size="s"
              >
                {i18n.translate(
                  'xpack.elasticAssistant.assistant.conversations.sidePanel.newChatButtonLabel',
                  {
                    defaultMessage: 'New chat',
                  }
                )}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isModalVisible && (
          <FormProvider {...hookFormMethods}>
            <EuiModal onClose={closeModal}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>
                  <h1>
                    {i18n.translate(
                      'xpack.elasticAssistant.assistant.conversations.sidePanel.createChatModalTitle',
                      {
                        defaultMessage: 'Create New Chat',
                      }
                    )}
                  </h1>
                </EuiModalHeaderTitle>
              </EuiModalHeader>
              <EuiModalBody>
                <TitleField conversationIds={conversationIds} />
              </EuiModalBody>
              <EuiModalFooter>
                <EuiButtonEmpty onClick={closeModal}>
                  {i18n.translate(
                    'xpack.elasticAssistant.assistant.conversations.sidePanelSide.cancelButtonLabel',
                    {
                      defaultMessage: 'Cancel',
                    }
                  )}
                </EuiButtonEmpty>
                <EuiButton onClick={hookFormMethods.handleSubmit(onSubmit)} fill>
                  {i18n.translate(
                    'xpack.elasticAssistant.assistant.conversations.sidePanel.saveButtonLabel',
                    {
                      defaultMessage: 'Save',
                    }
                  )}
                </EuiButton>
              </EuiModalFooter>
            </EuiModal>
          </FormProvider>
        )}
      </>
    );
  }
);

ConversationSidePanel.displayName = 'ConversationSidePanel';
