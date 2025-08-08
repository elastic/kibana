/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiTextArea,
  EuiCheckbox,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { SystemPromptSettings } from '../../../settings/use_settings_updater/use_system_prompt_updater';
import { Conversation } from '../../../../..';
import * as i18n from './translations';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import { SystemPromptSelector } from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';

interface Props {
  conversations: Record<string, Conversation>;
  onConversationSelectionChange: (currentPromptConversations: Conversation[]) => void;
  onNewConversationDefaultChange: (isChecked: boolean) => void;
  onPromptContentChange: (newValue: string) => void;
  onSystemPromptDelete: (id: string) => void;
  onSystemPromptSelect: (systemPrompt?: SystemPromptSettings | string) => void;
  resetSettings?: () => void;
  selectedSystemPrompt: SystemPromptSettings | undefined;
  setPaginationObserver: (ref: HTMLDivElement) => void;
  systemPromptSettings: SystemPromptSettings[];
}

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptEditorComponent: React.FC<Props> = ({
  conversations,
  onConversationSelectionChange,
  onNewConversationDefaultChange,
  onPromptContentChange,
  onSystemPromptDelete,
  onSystemPromptSelect,
  resetSettings,
  selectedSystemPrompt,
  setPaginationObserver,
  systemPromptSettings,
}) => {
  const disableFields = useMemo(() => selectedSystemPrompt == null, [selectedSystemPrompt]);
  // Prompt
  const promptContent = useMemo(
    // Fixing Cursor Jump in text area
    () => selectedSystemPrompt?.content ?? '',
    [selectedSystemPrompt?.content]
  );
  // Conversations this system prompt should be a default for
  const conversationOptions = useMemo(() => Object.values(conversations), [conversations]);

  const selectedConversations = useMemo(() => {
    return !disableFields && selectedSystemPrompt ? selectedSystemPrompt.conversations : [];
  }, [disableFields, selectedSystemPrompt]);

  // Whether this system prompt should be the default for new conversations
  const isNewConversationDefault = useMemo(
    () => selectedSystemPrompt?.isNewConversationDefault ?? false,
    [selectedSystemPrompt?.isNewConversationDefault]
  );
  const onContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onPromptContentChange(e.target.value),
    [onPromptContentChange]
  );
  const onCheckChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onNewConversationDefaultChange(e.target.checked),
    [onNewConversationDefaultChange]
  );

  return (
    <>
      <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_NAME} fullWidth>
        <SystemPromptSelector
          onSystemPromptDeleted={onSystemPromptDelete}
          onSystemPromptSelectionChange={onSystemPromptSelect}
          selectedSystemPrompt={selectedSystemPrompt}
          resetSettings={resetSettings}
          systemPrompts={systemPromptSettings}
        />
      </EuiFormRow>
      <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_PROMPT} fullWidth>
        <EuiTextArea
          data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT}
          disabled={disableFields}
          onChange={onContentChange}
          placeholder={i18n.SYSTEM_PROMPT_PROMPT_PLACEHOLDER}
          value={promptContent}
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
          conversations={conversationOptions}
          isDisabled={disableFields}
          onConversationSelectionChange={onConversationSelectionChange}
          selectedConversations={selectedConversations}
          setPaginationObserver={setPaginationObserver}
        />
      </EuiFormRow>

      <EuiFormRow display="rowCompressed">
        <EuiCheckbox
          data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS}
          disabled={disableFields}
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
          onChange={onCheckChange}
        />
      </EuiFormRow>
    </>
  );
};

export const SystemPromptEditor = React.memo(SystemPromptEditorComponent);

SystemPromptEditor.displayName = 'SystemPromptEditor';
