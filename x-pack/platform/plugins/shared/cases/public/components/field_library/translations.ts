/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_FETCHING_FIELD_DEFINITIONS = i18n.translate(
  'xpack.cases.fieldLibrary.errorFetchingFieldDefinitions',
  { defaultMessage: 'Failed to fetch field definitions' }
);

export const SUCCESS_CREATING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.successCreatingFieldDefinition',
  { defaultMessage: 'Field definition created successfully' }
);

export const ERROR_CREATING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.errorCreatingFieldDefinition',
  { defaultMessage: 'Failed to create field definition' }
);

export const SUCCESS_UPDATING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.successUpdatingFieldDefinition',
  { defaultMessage: 'Field definition updated successfully' }
);

export const ERROR_UPDATING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.errorUpdatingFieldDefinition',
  { defaultMessage: 'Failed to update field definition' }
);

export const ERROR_REORDERING_GLOBAL_FIELD_DEFINITIONS = i18n.translate(
  'xpack.cases.fieldLibrary.errorReorderingGlobalFieldDefinitions',
  { defaultMessage: 'Failed to update global field order' }
);

export const SUCCESS_DELETING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.successDeletingFieldDefinition',
  { defaultMessage: 'Field definition deleted successfully' }
);

export const ERROR_DELETING_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.errorDeletingFieldDefinition',
  { defaultMessage: 'Failed to delete field definition' }
);

export const FIELD_LIBRARY_TITLE = i18n.translate('xpack.cases.fieldLibrary.title', {
  defaultMessage: 'Field library',
});

export const FIELD_LIBRARY_DESCRIPTION = i18n.translate('xpack.cases.fieldLibrary.description', {
  defaultMessage: 'Define a field once, then show it on every case or add it to any template.',
});

export const CREATE_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.createFieldDefinition',
  { defaultMessage: 'Create field definition' }
);

export const EDIT_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.editFieldDefinition',
  { defaultMessage: 'Edit field definition' }
);

export const DELETE_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.deleteFieldDefinition',
  { defaultMessage: 'Delete field definition' }
);

export const MOVE_GLOBAL_FIELD_UP = i18n.translate('xpack.cases.fieldLibrary.moveGlobalFieldUp', {
  defaultMessage: 'Move global field up',
});

export const MOVE_GLOBAL_FIELD_DOWN = i18n.translate(
  'xpack.cases.fieldLibrary.moveGlobalFieldDown',
  { defaultMessage: 'Move global field down' }
);

export const COPY_FIELD = i18n.translate('xpack.cases.fieldLibrary.copyField', {
  defaultMessage: 'Copy',
});

export const REFERENCE_FIELD = i18n.translate('xpack.cases.fieldLibrary.referenceField', {
  defaultMessage: 'Reference',
});

export const UNLINK_FIELD = i18n.translate('xpack.cases.fieldLibrary.unlinkField', {
  defaultMessage: 'Unlink',
});

export const LINKED_FIELDS_SECTION_TITLE = i18n.translate(
  'xpack.cases.fieldLibrary.linkedFieldsSectionTitle',
  { defaultMessage: 'Linked fields' }
);

export const INSERT_FIELD = i18n.translate('xpack.cases.fieldLibrary.insertField', {
  defaultMessage: 'Insert',
});

export const FIELD_LIBRARY_PANEL_TITLE = i18n.translate('xpack.cases.fieldLibrary.panelTitle', {
  defaultMessage: 'Field library',
});

export const FIELD_LIBRARY_PANEL_EMPTY = i18n.translate('xpack.cases.fieldLibrary.panelEmpty', {
  defaultMessage: 'No fields yet. Create one in the field library to insert it here.',
});

export const FIELD_ALREADY_EXISTS_ERROR = (fieldName: string) =>
  i18n.translate('xpack.cases.fieldLibrary.fieldAlreadyExistsError', {
    defaultMessage: 'Field "{fieldName}" already exists in this template.',
    values: { fieldName },
  });

export const LABEL_COLUMN = i18n.translate('xpack.cases.fieldLibrary.labelColumn', {
  defaultMessage: 'Label',
});

export const NAME_COLUMN = i18n.translate('xpack.cases.fieldLibrary.nameColumn', {
  defaultMessage: 'Name (field key)',
});

export const DESCRIPTION_COLUMN = i18n.translate('xpack.cases.fieldLibrary.descriptionColumn', {
  defaultMessage: 'Description',
});

export const CONTROL_TYPE_COLUMN = i18n.translate('xpack.cases.fieldLibrary.controlTypeColumn', {
  defaultMessage: 'Control type',
});

export const REQUIRED_BADGE = i18n.translate('xpack.cases.fieldLibrary.requiredBadge', {
  defaultMessage: 'Required',
});

export const REQUIRED_ON_CLOSE_BADGE = i18n.translate(
  'xpack.cases.fieldLibrary.requiredOnCloseBadge',
  { defaultMessage: 'Required on close' }
);

export const OWNER_COLUMN = i18n.translate('xpack.cases.fieldLibrary.ownerColumn', {
  defaultMessage: 'Owner',
});

export const FIELD_DEFINITION_FORM_TITLE_CREATE = i18n.translate(
  'xpack.cases.fieldLibrary.formTitleCreate',
  { defaultMessage: 'Create field definition' }
);

export const FIELD_DEFINITION_FORM_TITLE_EDIT = i18n.translate(
  'xpack.cases.fieldLibrary.formTitleEdit',
  { defaultMessage: 'Edit field definition' }
);

export const SAVE_FIELD_DEFINITION = i18n.translate(
  'xpack.cases.fieldLibrary.saveFieldDefinition',
  {
    defaultMessage: 'Save',
  }
);

export const CANCEL = i18n.translate('xpack.cases.fieldLibrary.cancel', {
  defaultMessage: 'Cancel',
});

export const FIELD_DEFINITION_NAME_LABEL = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionNameLabel',
  { defaultMessage: 'Field name' }
);

export const FIELD_DEFINITION_DESCRIPTION_LABEL = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionDescriptionLabel',
  { defaultMessage: 'Description' }
);

export const FIELD_DEFINITION_YAML_LABEL = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionYamlLabel',
  { defaultMessage: 'Field definition (YAML)' }
);

export const FIELD_DEFINITION_YAML_HELP_TEXT = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionYamlHelpText',
  { defaultMessage: 'Define one reusable field. Validation updates as you type.' }
);

export const FIELD_DEFINITION_YAML_INVALID = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionYamlInvalid',
  { defaultMessage: 'Complete the required field properties and correct invalid values.' }
);

export const FIELD_DEFINITION_YAML_INVALID_SYNTAX = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionYamlInvalidSyntax',
  { defaultMessage: 'Correct the YAML syntax to continue.' }
);

export const FIELD_DEFINITION_FORM_DESCRIPTION = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionFormDescription',
  { defaultMessage: 'Define a field you can apply to every case or add to any template.' }
);

export const FIELD_DEFINITION_PREVIEW_LABEL = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionPreviewLabel',
  { defaultMessage: 'Preview' }
);

export const FIELD_DEFINITION_PREVIEW_PLACEHOLDER = i18n.translate(
  'xpack.cases.fieldLibrary.fieldDefinitionPreviewPlaceholder',
  { defaultMessage: 'Enter a valid field definition above to see a live preview.' }
);

export const DELETE_CONFIRM_TITLE = i18n.translate('xpack.cases.fieldLibrary.deleteConfirmTitle', {
  defaultMessage: 'Delete field definition?',
});

export const DELETE_CONFIRM_BODY = (name: string) =>
  i18n.translate('xpack.cases.fieldLibrary.deleteConfirmBody', {
    defaultMessage: 'Are you sure you want to delete the field definition "{name}"?',
    values: { name },
  });

export const APPLY_TO_ALL_CASES_LABEL = i18n.translate('xpack.cases.fieldLibrary.isGlobalLabel', {
  defaultMessage: 'Global field',
});

export const APPLY_TO_ALL_CASES_HELP_TEXT = i18n.translate(
  'xpack.cases.fieldLibrary.isGlobalHelpText',
  {
    defaultMessage:
      'When enabled, this field appears in every case regardless of which template is applied.',
  }
);

export const GLOBAL_FIELDS_SECTION_TITLE = i18n.translate(
  'xpack.cases.fieldLibrary.globalFieldsSectionTitle',
  { defaultMessage: 'Global fields' }
);

export const GLOBAL_FIELDS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.cases.fieldLibrary.globalFieldsSectionDescription',
  {
    defaultMessage:
      "These fields appear on every case, even when no template is applied. On a case, they're listed before the template's fields — drag to reorder them.",
  }
);

export const GLOBAL_FIELDS_SECTION_EMPTY_LINK = i18n.translate(
  'xpack.cases.fieldLibrary.globalFieldsSectionEmptyLink',
  { defaultMessage: 'create or edit a field definition' }
);

export const TEMPLATE_FIELDS_SECTION_TITLE = i18n.translate(
  'xpack.cases.fieldLibrary.templateFieldsSectionTitle',
  { defaultMessage: 'Reusable fields' }
);

export const TEMPLATE_FIELDS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.cases.fieldLibrary.templateFieldsSectionDescription',
  {
    defaultMessage:
      'Add these fields to any template. They appear on a case only when that template is applied.',
  }
);

export const TEMPLATE_FIELDS_SECTION_EMPTY_LINK = i18n.translate(
  'xpack.cases.fieldLibrary.templateFieldsSectionEmptyLink',
  { defaultMessage: 'Create a field definition' }
);

export const REORDER_DISABLED_WHILE_SEARCHING = i18n.translate(
  'xpack.cases.fieldLibrary.reorderDisabledWhileSearching',
  { defaultMessage: 'Clear the search to reorder these fields.' }
);

export const EDIT_FIELD_DEFINITION_NAMED = (name: string) =>
  i18n.translate('xpack.cases.fieldLibrary.editFieldDefinitionNamed', {
    defaultMessage: 'Edit {name}',
    values: { name },
  });

export const NO_MATCHING_FIELD_DEFINITIONS = i18n.translate(
  'xpack.cases.fieldLibrary.noMatchingFieldDefinitions',
  { defaultMessage: 'No fields match your search.' }
);

export const SEARCH_FIELD_DEFINITIONS = i18n.translate(
  'xpack.cases.fieldLibrary.searchFieldDefinitions',
  { defaultMessage: 'Search fields' }
);

export const FIELD_ACTIONS_MENU = (name: string) =>
  i18n.translate('xpack.cases.fieldLibrary.fieldActionsMenu', {
    defaultMessage: 'Actions for {name}',
    values: { name },
  });

export const REORDER_FIELD_HANDLE = (name: string) =>
  i18n.translate('xpack.cases.fieldLibrary.reorderFieldHandle', {
    defaultMessage: 'Reorder {name}',
    values: { name },
  });

export const SAVING_FIELD_ORDER = i18n.translate('xpack.cases.fieldLibrary.savingFieldOrder', {
  defaultMessage: 'Saving order…',
});

export const FIELD_MOVED_ANNOUNCEMENT = (name: string, position: number, total: number) =>
  i18n.translate('xpack.cases.fieldLibrary.fieldMovedAnnouncement', {
    defaultMessage: 'Moved {name} to position {position} of {total}.',
    values: { name, position, total },
  });

export const FIELD_DEFINITIONS_TABLE_CAPTION = i18n.translate(
  'xpack.cases.fieldLibrary.tableCaption',
  {
    defaultMessage: 'Field definitions',
  }
);
