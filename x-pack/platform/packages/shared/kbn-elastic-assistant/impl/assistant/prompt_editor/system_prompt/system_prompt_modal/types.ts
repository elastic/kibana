/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Conversation } from '../../../../..';
import { SystemPromptSettings } from '../../../settings/use_settings_updater/use_system_prompt_updater';

export interface SystemPromptSettingsProps {
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
