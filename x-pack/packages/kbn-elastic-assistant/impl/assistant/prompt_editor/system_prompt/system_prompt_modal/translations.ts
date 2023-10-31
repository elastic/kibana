/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.settingsTitle',
  {
    defaultMessage: 'System Prompts',
  }
);
export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.settingsDescription',
  {
    defaultMessage:
      'Create and manage System Prompts. System Prompts are configurable chunks of context that are always sent for a given conversation.',
  }
);
export const ADD_SYSTEM_PROMPT_MODAL_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.modalTitle',
  {
    defaultMessage: 'System Prompts',
  }
);

export const SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const SYSTEM_PROMPT_PROMPT = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.promptLabel',
  {
    defaultMessage: 'Prompt',
  }
);

export const SYSTEM_PROMPT_PROMPT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.promptPlaceholder',
  {
    defaultMessage: 'Enter a System Prompt',
  }
);

export const SYSTEM_PROMPT_DEFAULT_CONVERSATIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.defaultConversationsLabel',
  {
    defaultMessage: 'Default conversations',
  }
);

export const SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.defaultNewConversationTitle',
  {
    defaultMessage: 'Use as default for all new conversations',
  }
);

export const SYSTEM_PROMPT_DEFAULT_CONVERSATIONS_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.settings.defaultConversationsHelpText',
  {
    defaultMessage: 'Conversations that should use this System Prompt by default',
  }
);

export const CANCEL = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.slCancelButtonTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVE = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.systemPrompt.slSaveButtonTitle',
  {
    defaultMessage: 'Save',
  }
);
