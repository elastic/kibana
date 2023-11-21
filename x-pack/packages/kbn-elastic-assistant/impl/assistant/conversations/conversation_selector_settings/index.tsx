/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import { Conversation } from '../../../..';
import { UseAssistantContext } from '../../../assistant_context';
import * as i18n from './translations';
import { SystemPromptSelectorOption } from '../../prompt_editor/system_prompt/system_prompt_modal/system_prompt_selector/system_prompt_selector';

interface Props {
  conversations: UseAssistantContext['conversations'];
  onConversationDeleted: (conversationId: string) => void;
  onConversationSelectionChange: (conversation?: Conversation | string) => void;
  selectedConversationId?: string;
}

const getPreviousConversationId = (conversationIds: string[], selectedConversationId = '') => {
  return conversationIds.indexOf(selectedConversationId) === 0
    ? conversationIds[conversationIds.length - 1]
    : conversationIds[conversationIds.indexOf(selectedConversationId) - 1];
};

const getNextConversationId = (conversationIds: string[], selectedConversationId = '') => {
  return conversationIds.indexOf(selectedConversationId) + 1 >= conversationIds.length
    ? conversationIds[0]
    : conversationIds[conversationIds.indexOf(selectedConversationId) + 1];
};

export type ConversationSelectorSettingsOption = EuiComboBoxOptionOption<{
  isDefault: boolean;
}>;

/**
 * A disconnected variant of the ConversationSelector component that allows for
 * modifiable settings without persistence. Also changes some styling and removes
 * the keyboard shortcuts. Could be merged w/ ConversationSelector if refactored
 * as a connected wrapper.
 */
export const ConversationSelectorSettings: React.FC<Props> = React.memo(
  ({
    conversations,
    onConversationDeleted,
    onConversationSelectionChange,
    selectedConversationId,
  }) => {
    const conversationIds = useMemo(() => Object.keys(conversations), [conversations]);

    const [conversationOptions, setConversationOptions] = useState<
      ConversationSelectorSettingsOption[]
    >(() => {
      return Object.values(conversations).map((conversation) => ({
        value: { isDefault: conversation.isDefault ?? false },
        label: conversation.id,
        'data-test-subj': conversation.id,
      }));
    });

    const selectedOptions = useMemo<ConversationSelectorSettingsOption[]>(() => {
      return selectedConversationId
        ? conversationOptions.filter((c) => c.label === selectedConversationId) ?? []
        : [];
    }, [conversationOptions, selectedConversationId]);

    const handleSelectionChange = useCallback(
      (conversationSelectorSettingsOption: ConversationSelectorSettingsOption[]) => {
        const newConversation =
          conversationSelectorSettingsOption.length === 0
            ? undefined
            : Object.values(conversations).find(
                (conversation) => conversation.id === conversationSelectorSettingsOption[0]?.label
              ) ?? conversationSelectorSettingsOption[0]?.label;
        onConversationSelectionChange(newConversation);
      },
      [onConversationSelectionChange, conversations]
    );

    // Callback for when user types to create a new conversation
    const onCreateOption = useCallback(
      (searchValue, flattenedOptions = []) => {
        if (!searchValue || !searchValue.trim().toLowerCase()) {
          return;
        }

        const normalizedSearchValue = searchValue.trim().toLowerCase();
        const optionExists =
          flattenedOptions.findIndex(
            (option: SystemPromptSelectorOption) =>
              option.label.trim().toLowerCase() === normalizedSearchValue
          ) !== -1;

        const newOption = {
          value: searchValue,
          label: searchValue,
        };

        if (!optionExists) {
          setConversationOptions([...conversationOptions, newOption]);
        }
        handleSelectionChange([newOption]);
      },
      [conversationOptions, handleSelectionChange]
    );

    // Callback for when a user selects a conversation
    const onChange = useCallback(
      (newOptions: ConversationSelectorSettingsOption[]) => {
        if (newOptions.length === 0) {
          handleSelectionChange([]);
        } else if (conversationOptions.findIndex((o) => o.label === newOptions?.[0].label) !== -1) {
          handleSelectionChange(newOptions);
        }
      },
      [conversationOptions, handleSelectionChange]
    );

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (label: string) => {
        setConversationOptions(conversationOptions.filter((o) => o.label !== label));
        if (selectedOptions?.[0]?.label === label) {
          handleSelectionChange([]);
        }
        onConversationDeleted(label);
      },
      [conversationOptions, handleSelectionChange, onConversationDeleted, selectedOptions]
    );

    const onLeftArrowClick = useCallback(() => {
      const prevId = getPreviousConversationId(conversationIds, selectedConversationId);
      const previousOption = conversationOptions.filter((c) => c.label === prevId);
      handleSelectionChange(previousOption);
    }, [conversationIds, conversationOptions, handleSelectionChange, selectedConversationId]);
    const onRightArrowClick = useCallback(() => {
      const nextId = getNextConversationId(conversationIds, selectedConversationId);
      const nextOption = conversationOptions.filter((c) => c.label === nextId);
      handleSelectionChange(nextOption);
    }, [conversationIds, conversationOptions, handleSelectionChange, selectedConversationId]);

    const renderOption: (
      option: ConversationSelectorSettingsOption,
      searchValue: string,
      OPTION_CONTENT_CLASSNAME: string
    ) => React.ReactNode = (option, searchValue, contentClassName) => {
      const { label, value } = option;
      return (
        <EuiFlexGroup
          alignItems="center"
          className={'parentFlexGroup'}
          component={'span'}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem
            component={'span'}
            grow={false}
            css={css`
              width: calc(100% - 60px);
            `}
          >
            <EuiHighlight
              search={searchValue}
              css={css`
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {label}
            </EuiHighlight>
          </EuiFlexItem>
          {!value?.isDefault && (
            <EuiFlexItem grow={false} component={'span'}>
              <EuiToolTip position="right" content={i18n.DELETE_CONVERSATION}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={i18n.DELETE_CONVERSATION}
                  color="danger"
                  data-test-subj="delete-conversation"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(label);
                  }}
                  css={css`
                    visibility: hidden;
                    .parentFlexGroup:hover & {
                      visibility: visible;
                    }
                  `}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    };

    return (
      <EuiFormRow
        label={i18n.SELECTED_CONVERSATION_LABEL}
        display="rowCompressed"
        css={css`
          min-width: 300px;
        `}
      >
        <EuiComboBox
          aria-label={i18n.CONVERSATION_SELECTOR_ARIA_LABEL}
          customOptionText={`${i18n.CONVERSATION_SELECTOR_CUSTOM_OPTION_TEXT} {searchValue}`}
          placeholder={i18n.CONVERSATION_SELECTOR_PLACE_HOLDER}
          singleSelection={{ asPlainText: true }}
          options={conversationOptions}
          selectedOptions={selectedOptions}
          onChange={onChange}
          onCreateOption={onCreateOption}
          renderOption={renderOption}
          compressed={true}
          prepend={
            <EuiButtonIcon
              iconType="arrowLeft"
              data-test-subj="arrowLeft"
              aria-label={i18n.PREVIOUS_CONVERSATION_TITLE}
              onClick={onLeftArrowClick}
              disabled={conversationIds.length <= 1}
            />
          }
          append={
            <EuiButtonIcon
              iconType="arrowRight"
              data-test-subj="arrowRight"
              aria-label={i18n.NEXT_CONVERSATION_TITLE}
              onClick={onRightArrowClick}
              disabled={conversationIds.length <= 1}
            />
          }
        />
      </EuiFormRow>
    );
  }
);

ConversationSelectorSettings.displayName = 'ConversationSelectorSettings';
