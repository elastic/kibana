/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const QUICK_PROMPTS_TABLE_COLUMN_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.quickPromptsTableColumnName',
  {
    defaultMessage: 'Name',
  }
);

export const QUICK_PROMPTS_TABLE_COLUMN_DATE_UPDATED = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.quickPromptsTableColumnDateUpdated',
  {
    defaultMessage: 'Date updated',
  }
);

export const QUICK_PROMPTS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.description',
  {
    defaultMessage:
      'Create and manage Quick Prompts. Quick Prompts are shortcuts to common actions.',
  }
);

export const QUICK_PROMPTS_TABLE_CREATE_BUTTON_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.createButtonTitle',
  {
    defaultMessage: 'Quick Prompt',
  }
);

export const QUICK_PROMPT_EDIT_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptEditFlyout.title',
  {
    defaultMessage: 'Quick Prompt',
  }
);

export const QUICK_PROMPTS_TABLE_COLUMN_CONTEXTS = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.quickPromptsTableColumnContexts',
  {
    defaultMessage: 'Contexts',
  }
);

export const DELETE_QUICK_PROMPT_MODAL_TITLE = (prompt: string) =>
  i18n.translate(
    'xpack.elasticAssistant.assistant.quickPromptsTable.modal.deleteQuickPromptConfirmationTitle',
    {
      values: { prompt },
      defaultMessage: 'Delete "{prompt}"?',
    }
  );

export const DELETE_QUICK_PROMPT_MODAL_DEFAULT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.modal.deleteQuickPromptConfirmationDefaultTitle',
  {
    defaultMessage: 'Delete quick prompt?',
  }
);

export const DELETE_QUICK_PROMPT_MODAL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPromptsTable.modal.deleteQuickPromptConfirmationMessage',
  {
    defaultMessage: 'You cannot recover the prompt once deleted',
  }
);
