/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const SYSTEM_PROMPTS_TABLE_COLUMN_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.systemPromptsTableColumnName',
  {
    defaultMessage: 'Name',
  }
);

export const SYSTEM_PROMPTS_TABLE_COLUMN_DEFAULT_CONVERSATIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.systemPromptsTableColumnDefaultConversations',
  {
    defaultMessage: 'Default conversations',
  }
);

export const SYSTEM_PROMPTS_TABLE_COLUMN_DATE_UPDATED = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.systemPromptsTableColumnDateUpdated',
  {
    defaultMessage: 'Date updated',
  }
);

export const SYSTEM_PROMPTS_TABLE_SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.settingsDescription',
  {
    defaultMessage:
      'Create and manage System Prompts. System Prompts are configurable chunks of context that are always sent as part of the conversation.',
  }
);

export const DELETE_SYSTEM_PROMPT_MODAL_TITLE = (prompt: string) =>
  i18n.translate(
    'xpack.elasticAssistant.assistant.promptEditor.modal.deleteSystemPromptConfirmationTitle',
    {
      values: { prompt },
      defaultMessage: 'Delete "{prompt}"?',
    }
  );

export const DELETE_SYSTEM_PROMPT_MODAL_DEFAULT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.modal.deleteSystemPromptConfirmationDefaultTitle',
  {
    defaultMessage: 'Delete system prompt?',
  }
);

export const DELETE_SYSTEM_PROMPT_MODAL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.modal.deleteSystemPromptConfirmationMessage',
  {
    defaultMessage: 'You cannot recover the prompt once deleted',
  }
);

export const CREATE_SYSTEM_PROMPT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.promptEditor.createSystemPromptLabel',
  {
    defaultMessage: 'System Prompt',
  }
);
