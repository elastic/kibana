/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';
import { SystemPromptEditor } from './system_prompt_editor';
import { SystemPromptSettingsProps } from './types';

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptSettings: React.FC<SystemPromptSettingsProps> = React.memo(
  ({
    conversations,
    onConversationSelectionChange,
    onNewConversationDefaultChange,
    onPromptContentChange,
    onSystemPromptDelete,
    onSystemPromptSelect,
    resetSettings,
    selectedSystemPrompt,
    systemPromptSettings,
    setPaginationObserver,
  }) => {
    return (
      <>
        <EuiTitle size={'s'}>
          <h2 data-test-subj={`systemPromptSettingsTitle`}>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <SystemPromptEditor
          conversations={conversations}
          onConversationSelectionChange={onConversationSelectionChange}
          onNewConversationDefaultChange={onNewConversationDefaultChange}
          onPromptContentChange={onPromptContentChange}
          onSystemPromptDelete={onSystemPromptDelete}
          onSystemPromptSelect={onSystemPromptSelect}
          resetSettings={resetSettings}
          selectedSystemPrompt={selectedSystemPrompt}
          setPaginationObserver={setPaginationObserver}
          systemPromptSettings={systemPromptSettings}
        />
      </>
    );
  }
);

SystemPromptSettings.displayName = 'SystemPromptSettings';
