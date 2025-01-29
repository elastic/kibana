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

export const COLUMN_CREATED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.columnCreatedLabel',
  {
    defaultMessage: 'Created',
  }
);
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.searchPlaceholder',
  {
    defaultMessage: 'Search for an entry',
  }
);

export const NEW_INDEX_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.newIndexEntryFlyoutTitle',
  {
    defaultMessage: 'New index entry',
  }
);

export const EDIT_INDEX_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.editIndexEntryFlyoutTitle',
  {
    defaultMessage: 'Edit index entry',
  }
);

export const NEW_DOCUMENT_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.newDocumentEntryFlyoutTitle',
  {
    defaultMessage: 'New document entry',
  }
);

export const EDIT_DOCUMENT_FLYOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.editDocumentEntryFlyoutTitle',
  {
    defaultMessage: 'Edit document entry',
  }
);

export const MANUAL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.manualButtonLabel',
  {
    defaultMessage: 'Manual',
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

export const DELETE_ENTRY_CONFIRMATION_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.deleteEntryContent',
  {
    defaultMessage: "You will not be able to recover this knowledge base entry once it's deleted.",
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

export const ENTRY_INDEX_NAME_INPUT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryIndexNameInputDescription',
  {
    defaultMessage:
      'Indices will only be available to select from this drop down list if they contain a semantic_text field. Please refer to the documentation for more information on configuring an index for use as a custom knowledge source.',
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
    defaultMessage: 'Data Description',
  }
);

export const ENTRY_DESCRIPTION_HELP_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryDescriptionHelpLabel',
  {
    defaultMessage: 'Describe when this custom knowledge should be used during a conversation.',
  }
);

export const ENTRY_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryDescriptionPlaceholder',
  {
    defaultMessage:
      'Example: "Use this index to answer any question related to asset information."',
  }
);

export const ENTRY_QUERY_DESCRIPTION_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryQueryDescriptionInputLabel',
  {
    defaultMessage: 'Query Instruction',
  }
);

export const ENTRY_QUERY_DESCRIPTION_HELP_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryQueryDescriptionHelpLabel',
  {
    defaultMessage:
      'Describe what query should be constructed by the model to retrieve this custom knowledge.',
  }
);

export const ENTRY_QUERY_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryQueryDescriptionPlaceholder',
  {
    defaultMessage:
      'Example: "Key terms to retrieve asset related information, like host names, IP Addresses or cloud objects."',
  }
);

export const ENTRY_OUTPUT_FIELDS_INPUT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryOutputFieldsInputLabel',
  {
    defaultMessage: 'Output Fields',
  }
);

export const ENTRY_OUTPUT_FIELDS_HELP_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryOutputFieldsHelpLabel',
  {
    defaultMessage:
      'What fields should be sent to the LLM. Leave empty to send the entire document.',
  }
);

export const ENTRY_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.entryFieldPlaceholder',
  {
    defaultMessage: 'semantic_text',
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

export const SAVE_BUTTON_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.saveButtonText',
  {
    defaultMessage: 'Save',
  }
);

export const DUPLICATE_ENTRY_CONFIRMATION_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.duplicateEntryConfirmationTitle',
  {
    defaultMessage: 'Duplicate entry?',
  }
);

export const DUPLICATE_ENTRY_CONFIRMATION_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.duplicateEntryConfirmationContent',
  {
    defaultMessage:
      'Changing a knowledge base entry from global to private will create a private copy of the original global entry. Please delete the global entry if you would like to revoke the content for other users.',
  }
);

export const MISSING_INDEX_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.missingIndexError',
  {
    defaultMessage: `Index doesn't exist`,
  }
);

export const MISSING_INDEX_TOOLTIP_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.missingIndexTootipContent',
  {
    defaultMessage:
      'The index assigned to this knowledge base entry is unavailable. Check the permissions on the configured index, or that the index has not been deleted. You can update the index to be used for this knowledge entry, or delete the entry entirely.',
  }
);

export const SECURITY_LABS_NOT_FULLY_LOADED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettingsManagement.securityLabsNotFullyLoadedTooltipContent',
  {
    defaultMessage: 'Security Labs content is not fully loaded. Click to reload.',
  }
);
