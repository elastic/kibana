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

export const SYSTEM_PROMPTS_TABLE_COLUMN_CREATED_ON = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.systemPromptsTableColumnCreatedOn',
  {
    defaultMessage: 'Created on',
  }
);

export const SYSTEM_PROMPTS_TABLE_COLUMN_ACTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.promptsTable.systemPromptsTableColumnActions',
  {
    defaultMessage: 'Actions',
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
