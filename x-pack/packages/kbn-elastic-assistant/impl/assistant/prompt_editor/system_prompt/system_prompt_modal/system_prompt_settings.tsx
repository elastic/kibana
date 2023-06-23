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

interface Props {
  onSystemPromptsChange?: (systemPrompts: Prompt[]) => void;
}

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptSettings: React.FC<Props> = React.memo(({ onSystemPromptsChange }) => {
  const { allSystemPrompts, conversations } = useAssistantContext();
  // Local state for quick prompts (returned to parent on save via onSystemPromptsChange())
  const [updatedSystemPrompts, setUpdatedSystemPrompts] = useState<Prompt[]>(allSystemPrompts);

  // Form options
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<Prompt>();
  // Prompt
  const [prompt, setPrompt] = useState('');
  const handlePromptTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);
  // Conversations this system prompt should be a default for
  const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([]);
  const onConversationSelectionChange = useCallback((newConversations: Conversation[]) => {
    setSelectedConversations(newConversations);
  }, []);
  // Whether this system prompt should be the default for new conversations
  const [isNewConversationDefault, setIsNewConversationDefault] = useState(false);
  const handleNewConversationDefaultChange = useCallback(
    (e) => {
      setIsNewConversationDefault(e.target.checked);
      if (selectedSystemPrompt != null) {
        setUpdatedSystemPrompts((prev) => {
          return prev.map((pp) => ({
            ...pp,
            isNewConversationDefault: selectedSystemPrompt.id === pp.id && e.target.checked,
          }));
        });
        setSelectedSystemPrompt((prev) =>
          prev != null ? { ...prev, isNewConversationDefault: e.target.checked } : prev
        );
      }
    },
    [selectedSystemPrompt]
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
      setSelectedConversations(
        newPrompt != null
          ? Object.values(conversations).filter(
              (conversation) => conversation?.apiConfig.defaultSystemPrompt?.id === newPrompt?.id
            )
          : []
      );
    },
    [conversations]
  );

  const onSystemPromptDeleted = useCallback((id: string) => {
    setUpdatedSystemPrompts((prev) => prev.filter((sp) => sp.id !== id));
  }, []);

  // useEffects
  // Update system prompts on any field change since editing is in place
  useEffect(() => {
    if (selectedSystemPrompt != null) {
      setUpdatedSystemPrompts((prev) => {
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
  }, [prompt, selectedSystemPrompt]);

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
          systemPrompts={updatedSystemPrompts}
          selectedSystemPrompt={selectedSystemPrompt}
        />
      </EuiFormRow>
      <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_PROMPT} fullWidth>
        <EuiTextArea
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
});

SystemPromptSettings.displayName = 'SystemPromptSettings';
