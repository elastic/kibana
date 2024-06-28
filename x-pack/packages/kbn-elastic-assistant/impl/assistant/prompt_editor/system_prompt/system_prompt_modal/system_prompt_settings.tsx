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
    connectors,
    conversationSettings,
    onSelectedSystemPromptChange,
    selectedSystemPrompt,
    setUpdatedSystemPromptSettings,
    setConversationSettings,
    systemPromptSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
    defaultConnector,
  }) => {
    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <SystemPromptEditor
          connectors={connectors}
          conversationSettings={conversationSettings}
          onSelectedSystemPromptChange={onSelectedSystemPromptChange}
          selectedSystemPrompt={selectedSystemPrompt}
          setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
          setConversationSettings={setConversationSettings}
          systemPromptSettings={systemPromptSettings}
          conversationsSettingsBulkActions={conversationsSettingsBulkActions}
          setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          defaultConnector={defaultConnector}
        />
      </>
    );
  }
);

SystemPromptSettings.displayName = 'SystemPromptSettings';
