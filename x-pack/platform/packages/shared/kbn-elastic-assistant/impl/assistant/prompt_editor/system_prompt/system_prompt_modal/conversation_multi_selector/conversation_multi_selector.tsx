/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { css } from '@emotion/react';
import { TEST_IDS } from '../../../../constants';
import { Conversation } from '../../../../../..';
import * as i18n from '../translations';

interface Props {
  isDisabled?: boolean;
  onConversationSelectionChange: (currentPromptConversations: Conversation[]) => void;
  conversations: Conversation[];
  selectedConversations?: Conversation[];
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

/**
 * Selector for choosing multiple Conversations
 */
export const ConversationMultiSelector: React.FC<Props> = React.memo(
  ({
    conversations,
    isDisabled = false,
    onConversationSelectionChange,
    selectedConversations = [],
    setPaginationObserver,
  }) => {
    const lastConversationId = useMemo(() => {
      const allIds = Object.values(conversations);
      return allIds[allIds.length - 1]?.id;
    }, [conversations]);
    const internalSetObserver = useCallback(
      (ref: HTMLDivElement | null) => {
        if (ref) setPaginationObserver(ref);
      },
      [setPaginationObserver]
    );
    // ComboBox options
    const options = useMemo<EuiComboBoxOptionOption[]>(
      () =>
        conversations.map((conversation) => {
          return {
            label: conversation.title ?? '',
            id: conversation.id,
            'data-test-subj': TEST_IDS.CONVERSATIONS_MULTISELECTOR_OPTION(conversation.title),
            append:
              conversation.id === lastConversationId ? (
                <div
                  ref={internalSetObserver}
                  css={css`
                    display: block;
                    height: 1px;
                    width: 1px;
                  `}
                />
              ) : undefined,
          };
        }),
      [conversations, lastConversationId, internalSetObserver]
    );
    const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(() => {
      return selectedConversations != null
        ? selectedConversations.map((conversation) => ({
            label: conversation.title,
            id: conversation.id,
          }))
        : [];
    }, [selectedConversations]);

    const handleSelectionChange = useCallback(
      (conversationMultiSelectorOption: EuiComboBoxOptionOption[]) => {
        const newConversationSelection = conversations.filter((conversation) =>
          conversationMultiSelectorOption.some((cmso) => conversation.id === cmso.id)
        );
        onConversationSelectionChange(newConversationSelection);
      },
      [conversations, onConversationSelectionChange]
    );

    // Callback for when user selects a conversation
    const onChange = useCallback(
      (newOptions: EuiComboBoxOptionOption[]) => {
        if (newOptions.length === 0) {
          handleSelectionChange([]);
        } else if (options.findIndex((o) => o.id === newOptions?.[0].id) !== -1) {
          handleSelectionChange(newOptions);
        }
      },
      [handleSelectionChange, options]
    );

    return (
      <EuiComboBox
        aria-label={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS}
        compressed
        data-test-subj={TEST_IDS.CONVERSATIONS_MULTISELECTOR}
        isDisabled={isDisabled}
        fullWidth
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
      />
    );
  }
);

ConversationMultiSelector.displayName = 'ConversationMultiSelector';
