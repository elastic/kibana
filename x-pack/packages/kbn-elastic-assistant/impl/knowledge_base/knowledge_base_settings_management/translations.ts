/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NEW = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.newLabel',
  {
    defaultMessage: 'New',
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

export const COLUMN_SHARING = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnSharingLabel',
  {
    defaultMessage: 'Sharing',
  }
);

export const COLUMN_AUTHOR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnAuthorLabel',
  {
    defaultMessage: 'Author',
  }
);

export const COLUMN_ENTRIES = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnEntriesLabel',
  {
    defaultMessage: 'Entries',
  }
);

export const COLUMN_SPACE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnSpaceLabel',
  {
    defaultMessage: 'Space',
  }
);

export const COLUMN_CREATED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnCreatedLabel',
  {
    defaultMessage: 'Created',
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

export const ENTRY_SHARING_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entrySharingInputLabel',
  {
    defaultMessage: 'Sharing',
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

export const SHARING_PRIVATE_OPTION_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.sharingPrivateOptionLabel',
  {
    defaultMessage: 'Private to you',
  }
);

export const SHARING_GLOBAL_OPTION_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.sharingGlobalOptionLabel',
  {
    defaultMessage: 'Global to everyone in the Space',
  }
);

export const SHARING_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.sharingHelpText',
  {
    defaultMessage: 'Set to global if you’d like other users in your Org to have access.',
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

export const KNOWLEDGE_BASE_DOCUMENTATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.knowledgeBaseDocumentation',
  {
    defaultMessage: 'Learn more',
  }
);

export const GLOBAL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.knowledgeBaseGlobal',
  {
    defaultMessage: 'Global',
  }
);

export const PRIVATE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.knowledgeBasePrivate',
  {
    defaultMessage: 'Private',
  }
);
