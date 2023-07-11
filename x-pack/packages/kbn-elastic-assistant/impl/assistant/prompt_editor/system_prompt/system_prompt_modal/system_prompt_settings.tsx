/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiTextArea,
  EuiCheckbox,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { Conversation, Prompt } from '../../../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../../../assistant_context';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import { SystemPromptSelector } from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';

interface Props {
  systemPromptSettings: Prompt[];
  onSelectedSystemPromptChange?: (systemPrompt?: Prompt) => void;
  selectedSystemPrompt?: Prompt;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
}

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptSettings: React.FC<Props> = React.memo(
  ({
    systemPromptSettings,
    onSelectedSystemPromptChange,
    selectedSystemPrompt: defaultSystemPrompt,
    setUpdatedSystemPromptSettings,
  }) => {
    const { conversations } = useAssistantContext();

    // Form options
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState(defaultSystemPrompt);
    // Prompt
    const [prompt, setPrompt] = useState(defaultSystemPrompt?.content ?? '');
    const handlePromptTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    }, []);
    // Conversations this system prompt should be a default for // TODO: Calculate defaults from defaultSystemPrompt
    const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([]);

    const onConversationSelectionChange = useCallback(
      (currentPromptConversations: Conversation[]) => {
        setSelectedConversations(currentPromptConversations);
      },
      []
    );

    /*
     * updatedConversationWithPrompts calculates the present of prompt for
     * each conversation. Based on the values of selected conversation, it goes
     * through each conversation adds/removed the selected prompt on each conversation.
     *
     * */
    const getUpdatedConversationWithPrompts = useCallback(() => {
      const currentPromptConversationIds = selectedConversations.map((convo) => convo.id);

      const allConversations = Object.values(conversations).map((convo) => ({
        ...convo,
        apiConfig: {
          ...convo.apiConfig,
          defaultSystemPromptId: currentPromptConversationIds.includes(convo.id)
            ? selectedSystemPrompt?.id
            : convo.apiConfig.defaultSystemPromptId === selectedSystemPrompt?.id
            ? // remove the default System Prompt if it is assigned to a conversation
              // but that conversation is not in the currentPromptConversationList
              // This means conversation was removed in the current transaction
              undefined
            : //  leave it as it is .. if that conversation was neither added nor removed.
              convo.apiConfig.defaultSystemPromptId,
        },
      }));

      return allConversations;
    }, [selectedSystemPrompt, conversations, selectedConversations]);
    // Whether this system prompt should be the default for new conversations
    const [isNewConversationDefault, setIsNewConversationDefault] = useState(
      defaultSystemPrompt?.isNewConversationDefault ?? false
    );
    const handleNewConversationDefaultChange = useCallback(
      (e) => {
        const isChecked = e.target.checked;
        setIsNewConversationDefault(isChecked);
        if (selectedSystemPrompt != null) {
          setUpdatedSystemPromptSettings((prev) => {
            return prev.map((pp) => {
              return {
                ...pp,
                isNewConversationDefault: selectedSystemPrompt.id === pp.id && isChecked,
              };
            });
          });
          setSelectedSystemPrompt((prev) =>
            prev != null ? { ...prev, isNewConversationDefault: isChecked } : prev
          );
        }
      },
      [selectedSystemPrompt, setUpdatedSystemPromptSettings]
    );

    // When top level system prompt selection changes
    const onSystemPromptSelectionChange = useCallback(
      (systemPrompt?: Prompt | string) => {
        const newPrompt: Prompt | undefined =
          typeof systemPrompt === 'string'
            ? {
                id: systemPrompt ?? '',
                content: '',
                name: systemPrompt ?? '',
                promptType: 'system',
              }
            : systemPrompt;

        setSelectedSystemPrompt(newPrompt);
        setPrompt(newPrompt?.content ?? '');
        setIsNewConversationDefault(newPrompt?.isNewConversationDefault ?? false);
        // Find all conversations that have this system prompt as a default
        const currenlySelectedConversations =
          newPrompt != null
            ? Object.values(conversations).filter(
                (conversation) => conversation?.apiConfig.defaultSystemPromptId === newPrompt?.id
              )
            : [];
        setSelectedConversations(currenlySelectedConversations);
        onSelectedSystemPromptChange?.(newPrompt);
      },
      [conversations, onSelectedSystemPromptChange]
    );

    const onSystemPromptDeleted = useCallback(
      (id: string) => {
        setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== id));
      },
      [setUpdatedSystemPromptSettings]
    );

    // TODO: New update logic
    // const handleSave = useCallback(() => {
    //   const updatedConversations = getUpdatedConversationWithPrompts();
    //   onSystemPromptsChange(updatedSystemPrompts, updatedConversations);
    // }, [onSystemPromptsChange, updatedSystemPrompts, getUpdatedConversationWithPrompts]);

    // useEffects
    // Update system prompts on any field change since editing is in place
    useEffect(() => {
      if (selectedSystemPrompt != null) {
        setUpdatedSystemPromptSettings((prev) => {
          const alreadyExists = prev.some((sp) => sp.id === selectedSystemPrompt.id);
          if (alreadyExists) {
            return prev.map((sp) => {
              if (sp.id === selectedSystemPrompt.id) {
                return {
                  ...sp,
                  content: prompt,
                  promptType: 'system',
                };
              }
              return sp;
            });
          } else {
            return [
              ...prev,
              {
                ...selectedSystemPrompt,
                content: prompt,
                promptType: 'system',
              },
            ];
          }
        });
      }
    }, [prompt, selectedSystemPrompt, setUpdatedSystemPromptSettings]);

    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_NAME} fullWidth>
          <SystemPromptSelector
            onSystemPromptDeleted={onSystemPromptDeleted}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            systemPrompts={systemPromptSettings}
            selectedSystemPrompt={selectedSystemPrompt}
          />
        </EuiFormRow>
        <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_PROMPT} fullWidth>
          <EuiTextArea
            data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT}
            onChange={handlePromptTextChange}
            value={prompt}
            compressed
            fullWidth
            css={css`
              min-height: 150px;
            `}
          />
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          fullWidth
          helpText={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS_HELP_TEXT}
          label={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS}
        >
          <ConversationMultiSelector
            onConversationSelectionChange={onConversationSelectionChange}
            conversations={Object.values(conversations)}
            selectedConversations={selectedConversations}
          />
        </EuiFormRow>

        <EuiFormRow display="rowCompressed">
          <EuiCheckbox
            data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS}
            id={'defaultNewConversation'}
            label={
              <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
                <EuiFlexItem>{i18n.SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={isNewConversationDefault ? 'starFilled' : 'starEmpty'} />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            checked={isNewConversationDefault}
            onChange={handleNewConversationDefaultChange}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }
);

SystemPromptSettings.displayName = 'SystemPromptSettings';
