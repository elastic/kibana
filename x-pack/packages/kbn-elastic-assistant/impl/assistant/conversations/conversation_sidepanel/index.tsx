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
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { v4 as uuidv4 } from 'uuid';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { Conversation } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import * as i18n from './translations';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { useConversation } from '../../use_conversation';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  selectedConversationId: string | undefined;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle?: string }) => void;
  onConversationDeleted: (conversationId: string) => void;
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
    defaultConnectorId,
    defaultProvider,
    onConversationSelected,
    onConversationDeleted,
    shouldDisableKeyboardShortcut = () => false,
    isDisabled = false,
    conversations,
  }) => {
    const { allSystemPrompts } = useAssistantContext();

    const { createConversation } = useConversation();
    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);
    const conversationOptions = useMemo<ConversationSelectorOption[]>(() => {
      return Object.values(conversations).map((conversation) => ({
        value: { isDefault: conversation.isDefault ?? false },
        id: conversation.id ?? conversation.title,
        label: conversation.title,
      }));
    }, [conversations]);

    // Callback for when user types to create a new system prompt
    const onCreateOption = useCallback(async () => {
      const defaultSystemPrompt = allSystemPrompts.find(
        (systemPrompt) => systemPrompt.isNewConversationDefault
      );

      const newConversation: Conversation = {
        id: uuidv4(),
        title: 'New chat',
        messages: [],
        apiConfig: {
          connectorId: defaultConnectorId,
          provider: defaultProvider,
          defaultSystemPromptId: defaultSystemPrompt?.id,
        },
      };

      let cId;
      try {
        cId = (await createConversation(newConversation))?.id;
        onConversationSelected({ cId: cId ?? DEFAULT_CONVERSATION_TITLE });
      } catch (e) {}
    }, [
      allSystemPrompts,
      onConversationSelected,
      defaultConnectorId,
      defaultProvider,
      createConversation,
    ]);

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (cId: string) => {
        onConversationDeleted(cId);
        if (selectedConversationId === cId) {
          const prevConversationId = getPreviousConversationId(conversationIds, cId);
          onConversationSelected({
            cId: prevConversationId,
            cTitle: conversations[prevConversationId].title,
          });
        }
      },
      [
        selectedConversationId,
        onConversationDeleted,
        onConversationSelected,
        conversationIds,
        conversations,
      ]
    );

    const onChange = useCallback(
      async (newOptions: ConversationSelectorOption[]) => {
        if (newOptions.length === 0 || !newOptions?.[0].id) {
          // setSelectedOptions([]);
        } else if (conversationOptions.findIndex((o) => o.id === newOptions?.[0].id) !== -1) {
          const { id, label } = newOptions?.[0];
          await onConversationSelected({ cId: id, cTitle: label });
        }
      },
      [conversationOptions, onConversationSelected]
    );

    const onLeftArrowClick = useCallback(() => {
      const prevId = getPreviousConversationId(conversationIds, selectedConversationId);
      onConversationSelected({ cId: prevId, cTitle: conversations[prevId].title });
    }, [conversationIds, selectedConversationId, onConversationSelected, conversations]);
    const onRightArrowClick = useCallback(() => {
      const nextId = getNextConversationId(conversationIds, selectedConversationId);
      onConversationSelected({ cId: nextId, cTitle: conversations[nextId].title });
    }, [conversationIds, selectedConversationId, onConversationSelected, conversations]);

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
    useEvent('keydown', onKeyDown);

    console.error('conversation', conversations);

    return (
      <EuiPanel>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiListGroup>
              {Object.values(conversations).map((conversation) => (
                <EuiListGroupItem
                  onClick={() =>
                    onConversationSelected({ cId: conversation.id, cTitle: conversation.title })
                  }
                  label={conversation.title}
                  isActive={conversation.id === selectedConversationId}
                  extraAction={{
                    color: 'danger',
                    onClick: () => onDelete(conversation.id),
                    iconType: 'trash',
                    iconSize: 's',
                  }}
                />
              ))}
            </EuiListGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton color="primary" iconType="discuss" onClick={onCreateOption}>
              {'New chat'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

ConversationSidePanel.displayName = 'ConversationSidePanel';
