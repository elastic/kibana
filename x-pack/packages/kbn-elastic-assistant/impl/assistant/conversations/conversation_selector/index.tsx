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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { css } from '@emotion/react';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { Conversation } from '../../../..';
import { useAssistantContext } from '../../../assistant_context';
import * as i18n from './translations';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { useConversation } from '../../use_conversation';
import { SystemPromptSelectorOption } from '../../prompt_editor/system_prompt/system_prompt_modal/system_prompt_selector/system_prompt_selector';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

interface Props {
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  selectedConversationTitle: string | undefined;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  onConversationDeleted: (conversationId: string) => void;
  shouldDisableKeyboardShortcut?: () => boolean;
  isDisabled?: boolean;
  conversations: Record<string, Conversation>;
}

const getPreviousConversationTitle = (
  conversationTitles: string[],
  selectedConversationTitle: string
) => {
  return conversationTitles.indexOf(selectedConversationTitle) === 0
    ? conversationTitles[conversationTitles.length - 1]
    : conversationTitles[conversationTitles.indexOf(selectedConversationTitle) - 1];
};

const getNextConversationTitle = (
  conversationTitles: string[],
  selectedConversationTitle: string
) => {
  return conversationTitles.indexOf(selectedConversationTitle) + 1 >= conversationTitles.length
    ? conversationTitles[0]
    : conversationTitles[conversationTitles.indexOf(selectedConversationTitle) + 1];
};

export type ConversationSelectorOption = EuiComboBoxOptionOption<{
  isDefault: boolean;
}>;

export const ConversationSelector: React.FC<Props> = React.memo(
  ({
    selectedConversationTitle = DEFAULT_CONVERSATION_TITLE,
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
    const conversationTitles = useMemo(() => Object.keys(conversations), [conversations]);
    const conversationOptions = useMemo<ConversationSelectorOption[]>(() => {
      return Object.values(conversations).map((conversation) => ({
        value: { isDefault: conversation.isDefault ?? false },
        id: conversation.id ?? conversation.title,
        label: conversation.title,
      }));
    }, [conversations]);

    const [selectedOptions, setSelectedOptions] = useState<ConversationSelectorOption[]>(() => {
      return conversationOptions.filter((c) => c.label === selectedConversationTitle) ?? [];
    });

    // Callback for when user types to create a new system prompt
    const onCreateOption = useCallback(
      async (searchValue, flattenedOptions = []) => {
        if (!searchValue || !searchValue.trim().toLowerCase()) {
          return;
        }

        const normalizedSearchValue = searchValue.trim().toLowerCase();
        const defaultSystemPrompt = allSystemPrompts.find(
          (systemPrompt) => systemPrompt.isNewConversationDefault
        );
        const optionExists =
          flattenedOptions.findIndex(
            (option: SystemPromptSelectorOption) =>
              option.label.trim().toLowerCase() === normalizedSearchValue
          ) !== -1;

        let createdConversation;
        if (!optionExists) {
          const newConversation: Conversation = {
            id: searchValue,
            title: searchValue,
            category: 'assistant',
            messages: [],
            apiConfig: {
              connectorId: defaultConnectorId,
              provider: defaultProvider,
              defaultSystemPromptId: defaultSystemPrompt?.id,
            },
          };
          createdConversation = await createConversation(newConversation);
        }
        onConversationSelected(
          createdConversation
            ? { cId: createdConversation.id, cTitle: createdConversation.title }
            : { cId: DEFAULT_CONVERSATION_TITLE, cTitle: DEFAULT_CONVERSATION_TITLE }
        );
      },
      [
        allSystemPrompts,
        onConversationSelected,
        defaultConnectorId,
        defaultProvider,
        createConversation,
      ]
    );

    // Callback for when user deletes a conversation
    const onDelete = useCallback(
      (cId: string) => {
        onConversationDeleted(cId);
        if (selectedConversationTitle === cId) {
          const prevConversationTitle = getPreviousConversationTitle(
            conversationTitles,
            selectedConversationTitle
          );
          onConversationSelected({
            cId: conversations[prevConversationTitle].id,
            cTitle: prevConversationTitle,
          });
        }
      },
      [
        selectedConversationTitle,
        onConversationDeleted,
        onConversationSelected,
        conversationTitles,
        conversations,
      ]
    );

    const onChange = useCallback(
      async (newOptions: ConversationSelectorOption[]) => {
        if (newOptions.length === 0 || !newOptions?.[0].id) {
          setSelectedOptions([]);
        } else if (conversationOptions.findIndex((o) => o.id === newOptions?.[0].id) !== -1) {
          const { id, label } = newOptions?.[0];
          await onConversationSelected({ cId: id, cTitle: label });
        }
      },
      [conversationOptions, onConversationSelected]
    );

    const onLeftArrowClick = useCallback(() => {
      const prevTitle = getPreviousConversationTitle(conversationTitles, selectedConversationTitle);
      onConversationSelected({ cId: conversations[prevTitle].id, cTitle: prevTitle });
    }, [conversationTitles, selectedConversationTitle, onConversationSelected, conversations]);
    const onRightArrowClick = useCallback(() => {
      const nextTitle = getNextConversationTitle(conversationTitles, selectedConversationTitle);
      onConversationSelected({ cId: conversations[nextTitle].id, cTitle: nextTitle });
    }, [conversationTitles, selectedConversationTitle, onConversationSelected, conversations]);

    // Register keyboard listener for quick conversation switching
    const onKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (isDisabled || conversationTitles.length <= 1) {
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
        conversationTitles.length,
        isDisabled,
        onLeftArrowClick,
        onRightArrowClick,
        shouldDisableKeyboardShortcut,
      ]
    );
    useEvent('keydown', onKeyDown);

    useEffect(() => {
      setSelectedOptions(conversationOptions.filter((c) => c.label === selectedConversationTitle));
    }, [conversationOptions, selectedConversationTitle]);

    const renderOption: (
      option: ConversationSelectorOption,
      searchValue: string,
      OPTION_CONTENT_CLASSNAME: string
    ) => React.ReactNode = (option, searchValue, contentClassName) => {
      const { label, value, id } = option;
      return (
        <EuiFlexGroup
          alignItems="center"
          className={'parentFlexGroup'}
          component={'span'}
          justifyContent="spaceBetween"
          data-test-subj={`convo-option-${label}`}
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
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(id ?? '');
                  }}
                  data-test-subj="delete-option"
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
          data-test-subj="conversation-selector"
          aria-label={i18n.CONVERSATION_SELECTOR_ARIA_LABEL}
          customOptionText={`${i18n.CONVERSATION_SELECTOR_CUSTOM_OPTION_TEXT} {searchValue}`}
          placeholder={i18n.CONVERSATION_SELECTOR_PLACE_HOLDER}
          singleSelection={{ asPlainText: true }}
          options={conversationOptions}
          selectedOptions={selectedOptions}
          onChange={onChange}
          onCreateOption={onCreateOption as unknown as () => void}
          renderOption={renderOption}
          compressed={true}
          isDisabled={isDisabled}
          prepend={
            <EuiToolTip content={`${i18n.PREVIOUS_CONVERSATION_TITLE} (⌘ + ←)`} display="block">
              <EuiButtonIcon
                iconType="arrowLeft"
                aria-label={i18n.PREVIOUS_CONVERSATION_TITLE}
                onClick={onLeftArrowClick}
                disabled={isDisabled || conversationTitles.length <= 1}
              />
            </EuiToolTip>
          }
          append={
            <EuiToolTip content={`${i18n.NEXT_CONVERSATION_TITLE} (⌘ + →)`} display="block">
              <EuiButtonIcon
                iconType="arrowRight"
                aria-label={i18n.NEXT_CONVERSATION_TITLE}
                onClick={onRightArrowClick}
                disabled={isDisabled || conversationTitles.length <= 1}
              />
            </EuiToolTip>
          }
        />
      </EuiFormRow>
    );
  }
);

ConversationSelector.displayName = 'ConversationSelector';
