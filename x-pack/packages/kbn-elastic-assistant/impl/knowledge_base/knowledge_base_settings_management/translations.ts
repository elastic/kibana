/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENTRY = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryLabel',
  {
    defaultMessage: 'Entry',
  }
);

export const INDEX = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.indexLabel',
  {
    defaultMessage: 'Index',
  }
);

export const DOCUMENT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.documentLabel',
  {
    defaultMessage: 'Document',
  }
);

export const COLUMN_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnNameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const COLUMN_USERS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnUsersLabel',
  {
    defaultMessage: 'Users',
  }
);

export const COLUMN_SPACE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnSpaceLabel',
  {
    defaultMessage: 'Space',
  }
);

export const COLUMN_DATE_CREATED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnDateCreatedLabel',
  {
    defaultMessage: 'Date created',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnActionsLabel',
  {
    defaultMessage: 'Actions',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.searchPlaceholder',
  {
    defaultMessage: 'Search for an entry',
  }
);

export const DEFAULT_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.defaultFlyoutTitle',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const MANUAL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.manualButtonLabel',
  {
    defaultMessage: 'Manual',
  }
);

export const CREATE_INDEX_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.createIndexTitle',
  {
    defaultMessage: 'New Index entry',
  }
);

export const NEW_ENTRY_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.newEntryTitle',
  {
    defaultMessage: 'New entry',
  }
);

export const DELETE_ENTRY_DEFAULT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.deleteEntryDefaultTitle',
  {
    defaultMessage: 'Delete item',
  }
);

export const ENTRY_NAME_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryNameInputLabel',
  {
    defaultMessage: 'Name',
  }
);

export const ENTRY_NAME_INPUT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryNameInputPlaceholder',
  {
    defaultMessage: 'Name your Knowledge Base entry',
  }
);

export const ENTRY_SPACE_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entrySpaceInputLabel',
  {
    defaultMessage: 'Space',
  }
);

export const ENTRY_SPACE_INPUT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entrySpaceInputPlaceholder',
  {
    defaultMessage: 'Select',
  }
);

export const DELETE_ENTRY_CONFIRMATION_TITLE = (title: string) =>
  i18n.translate(
    'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.deleteEntryTitle',
    {
      values: { title },
      defaultMessage: 'Delete "{title}"?',
    }
  );

export const ENTRY_MARKDOWN_INPUT_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryMarkdownInputText',
  {
    defaultMessage: 'Markdown text',
  }
);

export const ENTRY_ACCESS_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryAccessInputLabel',
  {
    defaultMessage: 'Access',
  }
);

export const ENTRY_ACCESS_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryAccessHelpText',
  {
    defaultMessage: 'Set to global if you’d like other users in your Org to have access.',
  }
);

export const ENTRY_ACCESS_USER_BUTTON_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryAccessUserButtonLabel',
  {
    defaultMessage: 'User',
  }
);

export const ENTRY_ACCESS_GLOBAL_BUTTON_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryAccessGlobalButtonLabel',
  {
    defaultMessage: 'Global',
  }
);

export const ENTRY_REQUIRED_KNOWLEDGE_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryRequiredKnowledgeHelpText',
  {
    defaultMessage:
      'Check to indicate a Knowledge Base entry that’s included in every conversation',
  }
);

export const ENTRY_REQUIRED_KNOWLEDGE_CHECKBOX_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryRequiredKnowledgeCheckboxLabel',
  {
    defaultMessage: 'Required knowledge',
  }
);

export const ENTRY_INDEX_NAME_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryIndexNameInputLabel',
  {
    defaultMessage: 'Index',
  }
);

export const ENTRY_FIELD_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryFieldInputLabel',
  {
    defaultMessage: 'Field',
  }
);

export const ENTRY_DESCRIPTION_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryDescriptionInputLabel',
  {
    defaultMessage: 'Description',
  }
);

export const ENTRY_INPUT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryInputPlaceholder',
  {
    defaultMessage: 'Input',
  }
);
