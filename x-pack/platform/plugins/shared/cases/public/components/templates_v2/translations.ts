/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_TEMPLATES = i18n.translate('xpack.cases.templates.noTemplates', {
  defaultMessage: 'You do not have any templates yet',
});

export const CREATE_TEMPLATE = i18n.translate('xpack.cases.templates.create', {
  defaultMessage: 'Create',
});

export const SAVE_TEMPLATE = i18n.translate('xpack.cases.templates.save', {
  defaultMessage: 'Save',
});

export const ADD_TEMPLATE_TITLE = i18n.translate('xpack.cases.templates.addTemplateTitle', {
  defaultMessage: 'Add template',
});

export const EDIT_TEMPLATE_TITLE = i18n.translate('xpack.cases.templates.editTemplateTitle', {
  defaultMessage: 'Edit template',
});

export const TEMPLATE_METADATA_SECTION_TITLE = i18n.translate(
  'xpack.cases.templates.templateMetadataSectionTitle',
  {
    defaultMessage: 'Template details',
  }
);

export const TEMPLATE_METADATA_SECTION_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.templateMetadataSectionDescription',
  {
    defaultMessage:
      'Identifies this template in the templates list. Saved with the template and edited here — these details are not part of the YAML definition and do not change case defaults.',
  }
);

export const TEMPLATE_NAME_LABEL = i18n.translate('xpack.cases.templates.templateNameLabel', {
  defaultMessage: 'Template name',
});

export const TEMPLATE_DESCRIPTION_LABEL = i18n.translate(
  'xpack.cases.templates.templateDescriptionLabel',
  {
    defaultMessage: 'Template description',
  }
);

export const TEMPLATE_TAGS_LABEL = i18n.translate('xpack.cases.templates.templateTagsLabel', {
  defaultMessage: 'Template tags',
});

export const TEMPLATE_TAGS_HELP_TEXT = i18n.translate(
  'xpack.cases.templates.templateTagsHelpText',
  {
    defaultMessage: 'Used for filtering and discovery in the templates list.',
  }
);

export const TEMPLATE_NAME_REQUIRED = i18n.translate('xpack.cases.templates.templateNameRequired', {
  defaultMessage: 'Template name is required.',
});

export const TEMPLATE_NAME_MAX_LENGTH = (max: number) =>
  i18n.translate('xpack.cases.templates.templateNameMaxLength', {
    defaultMessage: 'Template name must be {max} characters or fewer.',
    values: { max },
  });

export const TEMPLATE_DESCRIPTION_MAX_LENGTH = (max: number) =>
  i18n.translate('xpack.cases.templates.templateDescriptionMaxLength', {
    defaultMessage: 'Template description must be {max} characters or fewer.',
    values: { max },
  });

export const TEMPLATE_TAG_MAX_LENGTH = (max: number) =>
  i18n.translate('xpack.cases.templates.templateTagMaxLength', {
    defaultMessage: 'Each tag must be {max} characters or fewer.',
    values: { max },
  });

export const TEMPLATE_TAGS_MAX_COUNT = (max: number) =>
  i18n.translate('xpack.cases.templates.templateTagsMaxCount', {
    defaultMessage: 'A template can have up to {max} tags.',
    values: { max },
  });
export const TEMPLATE_FIELDS_LABEL = i18n.translate('xpack.cases.templates.templateFieldsLabel', {
  defaultMessage: 'Fields',
});

export const CASE_DEFAULT_TITLE = i18n.translate('xpack.cases.templates.caseDefaultTitle', {
  defaultMessage: 'Name',
});

export const CASE_DEFAULT_ASSIGNEES = i18n.translate('xpack.cases.templates.caseDefaultAssignees', {
  defaultMessage: 'Assignees',
});

export const CASE_DEFAULT_DESCRIPTION_ARIA_LABEL = i18n.translate(
  'xpack.cases.templates.caseDefaultDescriptionAriaLabel',
  {
    defaultMessage: 'Default case description markdown editor',
  }
);

export const CASE_DEFAULTS_SECTION_TITLE = i18n.translate(
  'xpack.cases.templates.caseDefaultsSectionTitle',
  {
    defaultMessage: 'Case defaults',
  }
);

export const TEMPLATE_SAVED = i18n.translate('xpack.cases.templates.templateSaved', {
  defaultMessage: 'Saved',
});

export const RESET = i18n.translate('xpack.cases.templates.reset', {
  defaultMessage: 'Reset',
});

export const DRAFT_SAVED = i18n.translate('xpack.cases.templates.draftSaved', {
  defaultMessage: 'Draft saved',
});

export const SAVING_DRAFT = i18n.translate('xpack.cases.templates.savingDraft', {
  defaultMessage: 'Saving…',
});

export const VALIDATION_LOADING_EDITOR = i18n.translate(
  'xpack.cases.templates.validation.loadingEditor',
  {
    defaultMessage: 'Loading editor...',
  }
);

export const VALIDATION_NO_ERRORS = i18n.translate('xpack.cases.templates.validation.noErrors', {
  defaultMessage: 'No validation errors',
});

export const REVERT_TO_DEFAULT = i18n.translate('xpack.cases.templates.revertToDefault', {
  defaultMessage: 'Revert to default template',
});

export const REVERT_TO_LAST_SAVED = i18n.translate('xpack.cases.templates.revertToLastSaved', {
  defaultMessage: 'Revert to last saved version',
});

export const REVERT_MODAL_TITLE = i18n.translate('xpack.cases.templates.revertModalTitle', {
  defaultMessage: 'Revert changes?',
});

export const REVERT_MODAL_BODY = i18n.translate('xpack.cases.templates.revertModalBody', {
  defaultMessage: 'All unsaved changes will be lost. This action cannot be undone.',
});

export const REVERT_MODAL_CONFIRM = i18n.translate('xpack.cases.templates.revertModalConfirm', {
  defaultMessage: 'Revert',
});

export const REVERT_MODAL_CANCEL = i18n.translate('xpack.cases.templates.revertModalCancel', {
  defaultMessage: 'Cancel',
});

export const FIX_VALIDATION_ERRORS = i18n.translate('xpack.cases.templates.fixValidationErrors', {
  defaultMessage: 'Please fix validation errors before saving.',
});

export const UNSAVED_CHANGES = i18n.translate('xpack.cases.templates.unsavedChanges', {
  defaultMessage: 'Unsaved changes',
});

export const FAILED_TO_SAVE_TEMPLATE = i18n.translate(
  'xpack.cases.templates.failedToSaveTemplate',
  {
    defaultMessage: 'Failed to save template',
  }
);

export const FIELD_REQUIRED = i18n.translate('xpack.cases.templates.fieldValidation.required', {
  defaultMessage: 'Required',
});

export const FIELD_MIN_VALUE = (min: number) =>
  i18n.translate('xpack.cases.templates.fieldValidation.minValue', {
    defaultMessage: 'Value must be at least {min}',
    values: { min },
  });

export const FIELD_MAX_VALUE = (max: number) =>
  i18n.translate('xpack.cases.templates.fieldValidation.maxValue', {
    defaultMessage: 'Value must be at most {max}',
    values: { max },
  });

export const FIELD_MIN_LENGTH = (min: number) =>
  i18n.translate('xpack.cases.templates.fieldValidation.minLength', {
    defaultMessage: 'Must be at least {min} characters',
    values: { min },
  });

export const FIELD_MAX_LENGTH = (max: number) =>
  i18n.translate('xpack.cases.templates.fieldValidation.maxLength', {
    defaultMessage: 'Must be at most {max} characters',
    values: { max },
  });

export const FIELD_PATTERN_MISMATCH = (regex: string) =>
  i18n.translate('xpack.cases.templates.fieldValidation.patternMismatch', {
    defaultMessage: 'Value does not match pattern: {regex}',
    values: { regex },
  });

export const FIELD_PATTERN_INVALID = i18n.translate(
  'xpack.cases.templates.fieldValidation.patternInvalid',
  {
    defaultMessage: 'Pattern is not a valid regular expression',
  }
);

export const INVALID_USER_PROFILES = (names: string[]) =>
  i18n.translate('xpack.cases.templates.fieldValidation.invalidUserProfiles', {
    defaultMessage: 'The following users do not exist and must be removed: {names}',
    values: { names: names.join(', ') },
  });

export const INVALID_USER_PICKER_DEFAULT = (name: string) =>
  i18n.translate('xpack.cases.templates.fieldValidation.invalidUserPickerDefault', {
    defaultMessage: 'User "{name}" in default values was not found or has changed.',
    values: { name },
  });

export const CONDITION_UNKNOWN_FIELD = (fieldName: string) =>
  i18n.translate('xpack.cases.templates.validation.conditionUnknownField', {
    defaultMessage:
      'Condition references unknown field "{fieldName}". It must match the name of a field defined in this template; otherwise the rule is always treated as true.',
    values: { fieldName },
  });

export const VALIDATION_RULE_NOT_APPLICABLE = (rule: string, fieldTypeTitle: string) =>
  i18n.translate('xpack.cases.templates.validation.ruleNotApplicable', {
    defaultMessage:
      'The "{rule}" rule has no effect on {fieldTypeTitle} fields and will be ignored.',
    values: { rule, fieldTypeTitle },
  });

export const REF_FIELD_COMPLETION_DETAIL = i18n.translate(
  'xpack.cases.templates.validation.refFieldCompletionDetail',
  { defaultMessage: 'Field library reference' }
);

export const REF_FIELD_COMPLETION_GLOBAL = i18n.translate(
  'xpack.cases.templates.validation.refFieldCompletionGlobal',
  { defaultMessage: 'Global field' }
);

// Autocomplete snippets — inserted as ready-to-edit field skeletons from the editor.
export const FIELD_SNIPPET_DESC_INPUT_TEXT = i18n.translate(
  'xpack.cases.templates.snippet.inputText',
  { defaultMessage: 'Insert a single-line text field' }
);

export const FIELD_SNIPPET_DESC_INPUT_NUMBER = i18n.translate(
  'xpack.cases.templates.snippet.inputNumber',
  { defaultMessage: 'Insert a numeric field' }
);

export const FIELD_SNIPPET_DESC_TEXTAREA = i18n.translate(
  'xpack.cases.templates.snippet.textarea',
  { defaultMessage: 'Insert a multi-line text field' }
);

export const FIELD_SNIPPET_DESC_SELECT_BASIC = i18n.translate(
  'xpack.cases.templates.snippet.selectBasic',
  { defaultMessage: 'Insert a single-select dropdown' }
);

export const FIELD_SNIPPET_DESC_RADIO_GROUP = i18n.translate(
  'xpack.cases.templates.snippet.radioGroup',
  { defaultMessage: 'Insert a radio button group' }
);

export const FIELD_SNIPPET_DESC_CHECKBOX_GROUP = i18n.translate(
  'xpack.cases.templates.snippet.checkboxGroup',
  { defaultMessage: 'Insert a checkbox group' }
);

export const FIELD_SNIPPET_DESC_DATE_PICKER = i18n.translate(
  'xpack.cases.templates.snippet.datePicker',
  { defaultMessage: 'Insert a date picker' }
);

export const FIELD_SNIPPET_DESC_TOGGLE = i18n.translate('xpack.cases.templates.snippet.toggle', {
  defaultMessage: 'Insert an on/off toggle',
});

export const FIELD_SNIPPET_DESC_USER_PICKER = i18n.translate(
  'xpack.cases.templates.snippet.userPicker',
  { defaultMessage: 'Insert a user picker' }
);

export const FIELD_SNIPPET_DESC_MARKDOWN = i18n.translate(
  'xpack.cases.templates.snippet.markdown',
  { defaultMessage: 'Insert a display-only markdown block' }
);

export const FIELD_SNIPPET_LABEL_REF = i18n.translate('xpack.cases.templates.snippet.refLabel', {
  defaultMessage: 'Field library reference ($ref)',
});

export const FIELD_SNIPPET_DESC_REF = i18n.translate('xpack.cases.templates.snippet.refDesc', {
  defaultMessage: 'Reference a reusable field from the field library',
});

export const ASSIGNEE_SNIPPET_DESC = i18n.translate('xpack.cases.templates.snippet.assignee', {
  defaultMessage: 'Add an assignee by user profile ID',
});

export const TEMPLATE_ENABLED = i18n.translate('xpack.cases.templates.enabled', {
  defaultMessage: 'Enabled',
});

export const TEMPLATE_DISABLED = i18n.translate('xpack.cases.templates.disabled', {
  defaultMessage: 'Disabled',
});

export const COLUMN_ENABLED = i18n.translate('xpack.cases.templates.columnEnabled', {
  defaultMessage: 'Enabled',
});

export const TEMPLATE_ENABLED_CAN_CREATE_CASES = i18n.translate(
  'xpack.cases.templates.enabledCanCreateCases',
  {
    defaultMessage: 'This template is enabled and can be used to create new cases.',
  }
);

export const TEMPLATE_DISABLED_CANNOT_CREATE_CASES = i18n.translate(
  'xpack.cases.templates.disabledCannotCreateCases',
  {
    defaultMessage: 'If the template is disabled, it cannot be used to create new cases.',
  }
);

export const SHOW_ONLY_DISABLED = i18n.translate('xpack.cases.templates.showOnlyDisabled', {
  defaultMessage: 'Show only disabled',
});

export const STATUS = i18n.translate('xpack.cases.templates.status', {
  defaultMessage: 'Status',
});

export const SHOW_ALL = i18n.translate('xpack.cases.templates.showAll', {
  defaultMessage: 'Show all',
});

export const ERROR_FETCHING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplates',
  {
    defaultMessage: 'Error fetching templates',
  }
);

export const ERROR_FETCHING_TEMPLATE_TAGS = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplateTags',
  {
    defaultMessage: 'Error fetching template tags',
  }
);

export const ERROR_FETCHING_TEMPLATE_CREATORS = i18n.translate(
  'xpack.cases.templates.errorFetchingTemplateCreators',
  {
    defaultMessage: 'Error fetching template creators',
  }
);

export const ERROR_CREATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorCreatingTemplate',
  {
    defaultMessage: 'Error creating template',
  }
);

export const SUCCESS_CREATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successCreatingTemplate',
  {
    defaultMessage: 'Template created successfully',
  }
);

export const ERROR_UPDATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorUpdatingTemplate',
  {
    defaultMessage: 'Error updating template',
  }
);

export const SUCCESS_UPDATING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successUpdatingTemplate',
  {
    defaultMessage: 'Template updated successfully',
  }
);

export const SUCCESS_CLONING_TEMPLATE = (templateName: string) =>
  i18n.translate('xpack.cases.templates.successCloningTemplate', {
    defaultMessage: '{templateName} was cloned successfully',
    values: { templateName },
  });

export const CLONED_TEMPLATE_NAME_PREFIX = (templateName: string) =>
  i18n.translate('xpack.cases.templates.clonedTemplateNamePrefix', {
    defaultMessage: 'Cloned: {templateName}',
    values: { templateName },
  });

export const ERROR_DELETING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorDeletingTemplate',
  {
    defaultMessage: 'Error deleting template',
  }
);

export const SUCCESS_DELETING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successDeletingTemplate',
  {
    defaultMessage: 'Template deleted successfully',
  }
);

export const ERROR_EXPORTING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.errorExportingTemplate',
  {
    defaultMessage: 'Error exporting template',
  }
);

export const SUCCESS_EXPORTING_TEMPLATE = i18n.translate(
  'xpack.cases.templates.successExportingTemplate',
  {
    defaultMessage: 'Template exported successfully',
  }
);

export const ERROR_BULK_DELETING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorBulkDeletingTemplates',
  {
    defaultMessage: 'Error deleting templates',
  }
);

export const SUCCESS_BULK_DELETING_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.successBulkDeletingTemplates', {
    values: { count },
    defaultMessage: '{count, plural, one {# template} other {# templates}} deleted successfully',
  });

export const ERROR_BULK_EXPORTING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorBulkExportingTemplates',
  {
    defaultMessage: 'Error exporting templates',
  }
);

export const SUCCESS_BULK_EXPORTING_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.successBulkExportingTemplates', {
    values: { count },
    defaultMessage: '{count, plural, one {# template} other {# templates}} exported successfully',
  });

// Table column names
export const COLUMN_NAME = i18n.translate('xpack.cases.templates.column.name', {
  defaultMessage: 'Name',
});

export const COLUMN_DESCRIPTION = i18n.translate('xpack.cases.templates.column.description', {
  defaultMessage: 'Description',
});

export const COLUMN_SOLUTION = i18n.translate('xpack.cases.templates.column.solution', {
  defaultMessage: 'Solution',
});

export const COLUMN_FIELDS = i18n.translate('xpack.cases.templates.column.fields', {
  defaultMessage: 'Fields',
});

export const COLUMN_TAGS = i18n.translate('xpack.cases.templates.column.tags', {
  defaultMessage: 'Tags',
});

export const COLUMN_CATEGORY = i18n.translate('xpack.cases.templates.column.category', {
  defaultMessage: 'Category',
});

export const COLUMN_SEVERITY = i18n.translate('xpack.cases.templates.column.severity', {
  defaultMessage: 'Severity',
});

export const COLUMN_AUTHOR = i18n.translate('xpack.cases.templates.column.author', {
  defaultMessage: 'Author',
});

export const CLOSE_PREVIEW = i18n.translate('xpack.cases.templates.closePreview', {
  defaultMessage: 'Close preview',
});

export const COLUMN_LAST_UPDATE = i18n.translate('xpack.cases.templates.column.lastUpdate', {
  defaultMessage: 'Last update',
});

export const COLUMN_LAST_TIME_USED = i18n.translate('xpack.cases.templates.column.lastTimeUsed', {
  defaultMessage: 'Last time used',
});

export const COLUMN_USAGE = i18n.translate('xpack.cases.templates.column.usage', {
  defaultMessage: 'Usage',
});

// Actions
export const ACTIONS = i18n.translate('xpack.cases.templates.actions', {
  defaultMessage: 'Actions',
});

export const EDIT_TEMPLATE = i18n.translate('xpack.cases.templates.editTemplate', {
  defaultMessage: 'Edit',
});

export const CLONE_TEMPLATE = i18n.translate('xpack.cases.templates.cloneTemplate', {
  defaultMessage: 'Clone',
});

export const EXPORT_TEMPLATE = i18n.translate('xpack.cases.templates.exportTemplate', {
  defaultMessage: 'Export',
});

export const PREVIEW_TEMPLATE = i18n.translate('xpack.cases.templates.previewTemplate', {
  defaultMessage: 'Preview',
});

export const PREVIEW_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.cases.templates.previewUnavailableTitle',
  {
    defaultMessage: "Can't preview this template",
  }
);

export const PREVIEW_UNAVAILABLE_BODY = i18n.translate(
  'xpack.cases.templates.previewUnavailableBody',
  {
    defaultMessage:
      'The template definition has errors. Fix the issues highlighted in the editor to preview the fields.',
  }
);

export const PREVIEW_EMPTY_TITLE = i18n.translate('xpack.cases.templates.previewEmptyTitle', {
  defaultMessage: 'Nothing to preview yet',
});

export const PREVIEW_EMPTY_BODY = i18n.translate('xpack.cases.templates.previewEmptyBody', {
  defaultMessage:
    'Add a template definition in the editor to see how it will appear when creating a case.',
});

export const DELETE_TEMPLATE = i18n.translate('xpack.cases.templates.deleteTemplate', {
  defaultMessage: 'Delete',
});

export const SHOWING_TEMPLATES = (total: number) =>
  i18n.translate('xpack.cases.templates.showingTemplates', {
    values: { total },
    defaultMessage: 'of {total}',
  });

export const SHOWING_SELECTED_TEMPLATES = (count: number) =>
  i18n.translate('xpack.cases.templates.selectedTemplatesTitle', {
    values: { count },
    defaultMessage: 'Selected {count} {count, plural, =1 {template} other {templates}}',
  });

export const CLEAR_FILTERS = i18n.translate('xpack.cases.templates.clearFilters', {
  defaultMessage: 'Clear filters',
});

export const BULK_ACTIONS = i18n.translate('xpack.cases.templates.bulkActions', {
  defaultMessage: 'Bulk actions',
});

export const BULK_EXPORT_TEMPLATES = i18n.translate('xpack.cases.templates.bulkExportTemplates', {
  defaultMessage: 'Export',
});

export const BULK_DELETE_TEMPLATES = i18n.translate('xpack.cases.templates.bulkDeleteTemplates', {
  defaultMessage: 'Delete',
});

export const BULK_DELETE_TITLE = (count: number) =>
  i18n.translate('xpack.cases.templates.bulkDeleteTitle', {
    values: { count },
    defaultMessage: 'Delete {count, plural, one {# template} other {# templates}}?',
  });

export const BULK_DELETE_MESSAGE = (count: number) =>
  i18n.translate('xpack.cases.templates.bulkDeleteMessage', {
    values: { count },
    defaultMessage:
      '{count, plural, one {This template} other {These {count} templates}} will no longer apply to new cases. Cases already using {count, plural, one {it} other {them}} keep their values. Export first if you want to keep a copy.',
  });

export const SHOWING = i18n.translate('xpack.cases.templates.showing', {
  defaultMessage: 'Showing',
});

export const CASE = i18n.translate('xpack.cases.templates.case', {
  defaultMessage: 'Case',
});

export const CASES = i18n.translate('xpack.cases.templates.cases', {
  defaultMessage: 'Cases',
});

export const DELETE_TITLE = (name: string) =>
  i18n.translate('xpack.cases.templates.deleteTitle', {
    values: { name },
    defaultMessage: 'Delete {name}?',
  });

export const DELETE_MESSAGE = (name: string) =>
  i18n.translate('xpack.cases.templates.deleteMessage', {
    values: { name },
    defaultMessage:
      '{name} will no longer apply to new cases. Cases already using it keep their values. Export it first if you want to keep a copy.',
  });
export const NO_TEMPLATES_BODY = i18n.translate('xpack.cases.templates.noTemplatesBody', {
  defaultMessage: 'Create templates that automatically populate values in new cases.',
});

export const NO_TEMPLATES_MATCH_FILTERS = i18n.translate(
  'xpack.cases.templates.noTemplatesMatchFilters',
  {
    defaultMessage: 'No templates match your search criteria',
  }
);

export const NO_TEMPLATES_MATCH_FILTERS_BODY = i18n.translate(
  'xpack.cases.templates.noTemplatesMatchFiltersBody',
  {
    defaultMessage: 'Try modifying your search or filters.',
  }
);

export const SEARCH_TEMPLATES = i18n.translate('xpack.cases.templates.searchTemplates', {
  defaultMessage: 'Search templates',
});

export const SEARCH_TEMPLATES_PLACEHOLDER = i18n.translate(
  'xpack.cases.templates.searchPlaceholder',
  {
    defaultMessage: 'Search by name, description, or field name',
  }
);

export const REFRESH_TEMPLATES = i18n.translate('xpack.cases.templates.refreshTemplates', {
  defaultMessage: 'Refresh templates',
});

export const TAGS = i18n.translate('xpack.cases.templates.tags', {
  defaultMessage: 'Tags',
});

export const CREATED_BY = i18n.translate('xpack.cases.templates.createdBy', {
  defaultMessage: 'Created by',
});

export const TEMPLATES_INFO_TITLE = i18n.translate('xpack.cases.templates.infoTitle', {
  defaultMessage: 'Create custom templates for your needs',
});

export const TEMPLATES_INFO_DESCRIPTION = i18n.translate('xpack.cases.templates.infoDescription', {
  defaultMessage:
    'Create templates with custom set of fields, that can automatically populate values in new cases.',
});

export const LEARN_MORE = i18n.translate('xpack.cases.templates.learnMore', {
  defaultMessage: 'Learn more',
});

export const ADD_TEMPLATE = i18n.translate('xpack.cases.templates.addTemplate', {
  defaultMessage: 'Add template',
});

export const IMPORT_TEMPLATE = i18n.translate('xpack.cases.templates.importTemplate', {
  defaultMessage: 'Import template',
});

export const IMPORT_TEMPLATE_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.importTemplateDescription',
  {
    defaultMessage: 'Requires YAML format upload',
  }
);

export const IMPORT_SELECTED = (count: number) =>
  i18n.translate('xpack.cases.templates.importSelected', {
    values: { count },
    defaultMessage: 'Import {count} {count, plural, one {template} other {templates}}',
  });

export const SUCCESS_IMPORTING_TEMPLATES = (created: number, updated: number) =>
  i18n.translate('xpack.cases.templates.successImportingTemplates', {
    values: { created, updated },
    defaultMessage:
      'Successfully imported: {created, plural, one {# template created} other {# templates created}}, {updated, plural, one {# template updated} other {# templates updated}}',
  });

export const ERROR_IMPORTING_TEMPLATES = i18n.translate(
  'xpack.cases.templates.errorImportingTemplates',
  {
    defaultMessage: 'Failed to import templates',
  }
);

export const IMPORT_PARTIAL_FAILURE = (succeeded: number, failed: number) =>
  i18n.translate('xpack.cases.templates.importPartialFailure', {
    values: { succeeded, failed },
    defaultMessage:
      '{succeeded, plural, one {# template} other {# templates}} imported, {failed, plural, one {# template} other {# templates}} failed',
  });

export const CANCEL = i18n.translate('xpack.cases.templates.cancel', {
  defaultMessage: 'Cancel',
});

export const STEP_UPLOAD_YAML = i18n.translate('xpack.cases.templates.stepUploadYaml', {
  defaultMessage: 'Upload YAML files',
});

export const STEP_SELECT_TEMPLATES = i18n.translate('xpack.cases.templates.stepSelectTemplates', {
  defaultMessage: 'Select templates',
});

export const NEXT = i18n.translate('xpack.cases.templates.next', {
  defaultMessage: 'Next',
});

export const BACK = i18n.translate('xpack.cases.templates.back', {
  defaultMessage: 'Back',
});

export const FILE_PICKER_PROMPT = i18n.translate('xpack.cases.templates.filePickerPrompt', {
  defaultMessage: 'Select or drag and drop multiple YAML files',
});

export const VALIDATION_ERRORS_TITLE = i18n.translate(
  'xpack.cases.templates.validationErrorsTitle',
  {
    defaultMessage: 'Some files could not be validated',
  }
);

export const FILES_VALIDATED = (count: number) =>
  i18n.translate('xpack.cases.templates.filesValidated', {
    values: { count },
    defaultMessage: '{count} {count, plural, one {file} other {files}} validated successfully',
  });

export const NEW_TEMPLATES_DETECTED = (count: number) =>
  i18n.translate('xpack.cases.templates.newTemplatesDetected', {
    values: { count },
    defaultMessage: '{count} new {count, plural, one {template} other {templates}} detected',
  });

export const OVERLAPPING_TEMPLATES_DETECTED = (count: number) =>
  i18n.translate('xpack.cases.templates.overlappingTemplatesDetected', {
    values: { count },
    defaultMessage:
      '{count} overlapping {count, plural, one {template} other {templates}} detected',
  });

export const OVERLAPPING_TEMPLATES_NOTE = i18n.translate(
  'xpack.cases.templates.overlappingTemplatesNote',
  {
    defaultMessage:
      'These templates already exist and will be saved as a new version of the existing template.',
  }
);

export const PARSE_ERRORS_TITLE = i18n.translate('xpack.cases.templates.parseErrorsTitle', {
  defaultMessage: 'Some templates could not be parsed',
});

export const NO_TEMPLATES_FOUND = i18n.translate('xpack.cases.templates.noTemplatesFound', {
  defaultMessage: 'No templates found',
});

export const NO_TEMPLATES_FOUND_BODY = i18n.translate(
  'xpack.cases.templates.noTemplatesFoundBody',
  {
    defaultMessage:
      'The uploaded files do not contain any valid templates. Please check the YAML format and try again.',
  }
);

export const INVALID_FILE_TYPE = (fileName: string) =>
  i18n.translate('xpack.cases.templates.invalidFileType', {
    values: { fileName },
    defaultMessage: '{fileName}: invalid file type. Only .yaml and .yml files are accepted.',
  });

export const FILE_TOO_LARGE = (fileName: string, maxSize: string) =>
  i18n.translate('xpack.cases.templates.fileTooLarge', {
    values: { fileName, maxSize },
    defaultMessage: '{fileName}: file exceeds the maximum allowed size of {maxSize}.',
  });

export const TOO_MANY_FILES = (max: number) =>
  i18n.translate('xpack.cases.templates.tooManyFiles', {
    values: { max },
    defaultMessage: 'Too many files. A maximum of {max} files can be uploaded at once.',
  });

export const INVALID_FILE_NAME = (fileName: string) =>
  i18n.translate('xpack.cases.templates.invalidFileName', {
    values: { fileName },
    defaultMessage: '{fileName}: file name contains invalid characters.',
  });

export const EMPTY_FILE = (fileName: string) =>
  i18n.translate('xpack.cases.templates.emptyFile', {
    values: { fileName },
    defaultMessage: '{fileName}: file is empty.',
  });

export const INVALID_YAML_SYNTAX = (fileName: string, reason: string) =>
  i18n.translate('xpack.cases.templates.invalidYamlSyntax', {
    values: { fileName, reason },
    defaultMessage: '{fileName}: invalid YAML syntax. {reason}',
  });

export const TOO_MANY_TEMPLATES_IN_FILE = (fileName: string, max: number) =>
  i18n.translate('xpack.cases.templates.tooManyTemplatesInFile', {
    values: { fileName, max },
    defaultMessage:
      '{fileName}: file contains more than {max} templates. Only the first {max} will be processed.',
  });

export const TOO_MANY_TEMPLATES_TOTAL = (max: number) =>
  i18n.translate('xpack.cases.templates.tooManyTemplatesTotal', {
    values: { max },
    defaultMessage: 'You can import a maximum of {max} templates at a time.',
  });

export const TEMPLATE_VALIDATION_ERROR = (fileName: string, index: number, issues: string) =>
  i18n.translate('xpack.cases.templates.templateValidationError', {
    values: { fileName, index, issues },
    defaultMessage: '{fileName}, template {index}: validation failed. {issues}',
  });

export const TEMPLATE_TITLE = i18n.translate('xpack.cases.templates.title', {
  defaultMessage: 'Templates',
});

export const CONFIRM_FIELD_EDIT = i18n.translate('xpack.cases.templates.confirmFieldEdit', {
  defaultMessage: 'Save field',
});

export const CANCEL_FIELD_EDIT = i18n.translate('xpack.cases.templates.cancelFieldEdit', {
  defaultMessage: 'Cancel field edit',
});

export const FIELD_TYPE_TITLE_INPUT_TEXT = i18n.translate(
  'xpack.cases.templates.fieldType.inputText',
  { defaultMessage: 'Text Input' }
);

export const FIELD_TYPE_TITLE_INPUT_NUMBER = i18n.translate(
  'xpack.cases.templates.fieldType.inputNumber',
  { defaultMessage: 'Number Input' }
);

export const FIELD_TYPE_TITLE_SELECT_BASIC = i18n.translate(
  'xpack.cases.templates.fieldType.selectBasic',
  { defaultMessage: 'Select' }
);

export const FIELD_TYPE_TITLE_TEXTAREA = i18n.translate(
  'xpack.cases.templates.fieldType.textarea',
  { defaultMessage: 'Textarea' }
);

export const FIELD_TYPE_TITLE_DATE_PICKER = i18n.translate(
  'xpack.cases.templates.fieldType.datePicker',
  { defaultMessage: 'Date Picker' }
);

export const FIELD_TYPE_TITLE_TOGGLE = i18n.translate('xpack.cases.templates.fieldType.toggle', {
  defaultMessage: 'Toggle',
});

export const FIELD_TYPE_TITLE_MARKDOWN = i18n.translate(
  'xpack.cases.templates.fieldType.markdown',
  { defaultMessage: 'Markdown (display only)' }
);

export const FIELD_TYPE_TITLE_CHECKBOX_GROUP = i18n.translate(
  'xpack.cases.templates.fieldType.checkboxGroup',
  { defaultMessage: 'Checkbox Group' }
);

export const FIELD_TYPE_TITLE_RADIO_GROUP = i18n.translate(
  'xpack.cases.templates.fieldType.radioGroup',
  { defaultMessage: 'Radio Group' }
);

export const FIELD_TYPE_TITLE_USER_PICKER = i18n.translate(
  'xpack.cases.templates.fieldType.userPicker',
  { defaultMessage: 'User Picker' }
);

export const TOGGLE_ON = i18n.translate('xpack.cases.templates.fieldType.toggle.on', {
  defaultMessage: 'On',
});

export const TOGGLE_OFF = i18n.translate('xpack.cases.templates.fieldType.toggle.off', {
  defaultMessage: 'Off',
});

export const TEMPLATE_DEFINITION_EMPTY = i18n.translate(
  'xpack.cases.templates.templateDefinitionEmpty',
  { defaultMessage: 'Template definition is empty' }
);

export const INVALID_YAML_NON_OBJECT = i18n.translate(
  'xpack.cases.templates.invalidYamlNonObject',
  { defaultMessage: 'Invalid YAML: parsed to null or non-object' }
);

export const INVALID_YAML_DEFINITION = i18n.translate(
  'xpack.cases.templates.invalidYamlDefinition',
  { defaultMessage: 'Invalid YAML definition' }
);

export const TEMPLATE_MISSING_REQUIRED_KEYS = (keys: string[]) =>
  i18n.translate('xpack.cases.templates.missingRequiredKeys', {
    defaultMessage:
      'The template YAML must include these keys so they stay visible in the preview: {keys}. Restore them to continue.',
    values: { keys: keys.join(', ') },
  });

export const CONNECTOR_TITLE = i18n.translate('xpack.cases.templates.preview.connectorTitle', {
  defaultMessage: 'Connector',
});

export const FIELDS_TAB_LABEL = i18n.translate('xpack.cases.templates.renderPanel.fieldsTab', {
  defaultMessage: 'Fields',
});

export const SETTINGS_TAB_LABEL = i18n.translate('xpack.cases.templates.renderPanel.settingsTab', {
  defaultMessage: 'Settings',
});

export const CONFIGURATION_TAB_LABEL = i18n.translate(
  'xpack.cases.templates.renderPanel.configurationTab',
  { defaultMessage: 'Configuration' }
);

export const CONFIGURATION_TAB_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.configuration.description',
  {
    defaultMessage:
      'Saved on the template and applied to every case it creates — not part of the YAML definition.',
  }
);

export const CONFIGURATION_CONNECTOR_GROUP_TITLE = i18n.translate(
  'xpack.cases.templates.configuration.connectorGroupTitle',
  { defaultMessage: 'Case settings & connector' }
);

export const CONFIGURATION_CONNECTOR_GROUP_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.configuration.connectorGroupDescription',
  {
    defaultMessage:
      'Case behavior and the default external connector applied to every case created from this template.',
  }
);

export const CONFIGURATION_TAB_NAME_REQUIRED = i18n.translate(
  'xpack.cases.templates.configuration.nameRequiredIndicator',
  { defaultMessage: 'A template name is required — set it on the Configuration tab.' }
);

export const FIELDS_TAB_HAS_ERRORS = i18n.translate(
  'xpack.cases.templates.fields.hasErrorsIndicator',
  { defaultMessage: 'The Fields definition has validation errors — fix them on the Fields tab.' }
);

export const SETTINGS_SECTION_TITLE = i18n.translate(
  'xpack.cases.templates.settings.sectionTitle',
  { defaultMessage: 'Case settings' }
);

export const SETTINGS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.cases.templates.settings.sectionDescription',
  {
    defaultMessage:
      'Defaults applied to cases created from this template. These values are also represented in YAML.',
  }
);

export const CONNECTOR_SECTION_TITLE = i18n.translate(
  'xpack.cases.templates.settings.connectorSectionTitle',
  { defaultMessage: 'External connector' }
);

export const CONNECTOR_NOT_FOUND = i18n.translate(
  'xpack.cases.templates.preview.connectorNotFound',
  {
    defaultMessage:
      'Connector not found. Cases created from this template will fall back to no connector.',
  }
);

// --- Editor Actions menu -----------------------------------------------------------------------

export const ACTIONS_MENU_BUTTON = i18n.translate('xpack.cases.templates.actionsMenu.button', {
  defaultMessage: 'Actions menu',
});

export const ACTIONS_MENU_ROOT_TITLE = i18n.translate('xpack.cases.templates.actionsMenu.title', {
  // Kept identical to the trigger label so the popover header and the chip read as one control.
  defaultMessage: 'Actions menu',
});

export const ACTIONS_MENU_ARIA = i18n.translate('xpack.cases.templates.actionsMenu.aria', {
  defaultMessage: 'Open the template actions menu',
});

export const ACTION_NEW_FIELD_TITLE = i18n.translate(
  'xpack.cases.templates.actionsMenu.newField.title',
  { defaultMessage: 'New field' }
);
export const ACTION_NEW_FIELD_DESC = i18n.translate(
  'xpack.cases.templates.actionsMenu.newField.desc',
  { defaultMessage: 'Scaffold a custom field of any type' }
);

export const ACTION_FIELD_LIBRARY_TITLE = i18n.translate(
  'xpack.cases.templates.actionsMenu.fieldLibrary.title',
  { defaultMessage: 'Field library' }
);
export const ACTION_FIELD_LIBRARY_DESC = i18n.translate(
  'xpack.cases.templates.actionsMenu.fieldLibrary.desc',
  { defaultMessage: 'Reference a saved field from the library' }
);

export const ACTION_VALIDATION_TITLE = i18n.translate(
  'xpack.cases.templates.actionsMenu.validation.title',
  { defaultMessage: 'Validation' }
);
export const ACTION_VALIDATION_DESC = i18n.translate(
  'xpack.cases.templates.actionsMenu.validation.desc',
  { defaultMessage: 'Add a validation rule to the selected field' }
);

export const ACTION_CONDITIONAL_TITLE = i18n.translate(
  'xpack.cases.templates.actionsMenu.conditional.title',
  { defaultMessage: 'Conditional logic' }
);
export const ACTION_CONDITIONAL_DESC = i18n.translate(
  'xpack.cases.templates.actionsMenu.conditional.desc',
  { defaultMessage: 'Show or require the selected field based on another' }
);

export const ACTIONS_MENU_SELECT_A_FIELD = i18n.translate(
  'xpack.cases.templates.actionsMenu.selectAField',
  { defaultMessage: 'Place the cursor on a field to enable this action' }
);

export const ACTIONS_MENU_SEARCH_FIELDS = i18n.translate(
  'xpack.cases.templates.actionsMenu.searchFields',
  { defaultMessage: 'Search library fields' }
);

export const ACTIONS_MENU_NO_LIBRARY_FIELDS_TITLE = i18n.translate(
  'xpack.cases.templates.actionsMenu.noLibraryFieldsTitle',
  { defaultMessage: 'No library fields yet' }
);

export const ACTIONS_MENU_NO_LIBRARY_FIELDS = i18n.translate(
  'xpack.cases.templates.actionsMenu.noLibraryFields',
  {
    defaultMessage:
      'Create reusable fields in the Field library, then reference them from any template.',
  }
);

export const ACTIONS_MENU_LOADING_LIBRARY = i18n.translate(
  'xpack.cases.templates.actionsMenu.loadingLibrary',
  { defaultMessage: 'Loading library fields…' }
);

export const ACTIONS_MENU_LIBRARY_GLOBAL_BADGE = i18n.translate(
  'xpack.cases.templates.actionsMenu.libraryGlobalBadge',
  { defaultMessage: 'Global' }
);

export const ACTIONS_MENU_FIELD_EXISTS = (name: string) =>
  i18n.translate('xpack.cases.templates.actionsMenu.fieldExists', {
    defaultMessage: '"{name}" is already in this template',
    values: { name },
  });

export const ACTIONS_MENU_RULE_EXISTS = (rule: string) =>
  i18n.translate('xpack.cases.templates.actionsMenu.ruleExists', {
    defaultMessage: '"{rule}" is already set on this field',
    values: { rule },
  });

export const ACTIONS_MENU_NO_FIELD_AT_CURSOR = i18n.translate(
  'xpack.cases.templates.actionsMenu.noFieldAtCursor',
  { defaultMessage: 'Place the cursor on a field before adding this rule' }
);

export const ACTIONS_MENU_FIX_YAML_FIRST = i18n.translate(
  'xpack.cases.templates.actionsMenu.fixYamlFirst',
  { defaultMessage: 'Fix the YAML errors before using the actions menu' }
);

export const ACTIONS_MENU_INVALID_YAML = i18n.translate(
  'xpack.cases.templates.actionsMenu.invalidYaml',
  { defaultMessage: 'Fix the YAML errors in the editor before adding to the template' }
);

// Validation rule labels
export const VALIDATION_RULE_REQUIRED = i18n.translate(
  'xpack.cases.templates.actionsMenu.rule.required',
  { defaultMessage: 'Required' }
);
export const VALIDATION_RULE_REQUIRED_ON_CLOSE = i18n.translate(
  'xpack.cases.templates.actionsMenu.rule.requiredOnClose',
  { defaultMessage: 'Required before closing' }
);
export const VALIDATION_RULE_PATTERN = i18n.translate(
  'xpack.cases.templates.actionsMenu.rule.pattern',
  { defaultMessage: 'Pattern (regex)' }
);
export const VALIDATION_RULE_MIN = i18n.translate('xpack.cases.templates.actionsMenu.rule.min', {
  defaultMessage: 'Minimum value',
});
export const VALIDATION_RULE_MAX = i18n.translate('xpack.cases.templates.actionsMenu.rule.max', {
  defaultMessage: 'Maximum value',
});
export const VALIDATION_RULE_MIN_LENGTH = i18n.translate(
  'xpack.cases.templates.actionsMenu.rule.minLength',
  { defaultMessage: 'Minimum length' }
);
export const VALIDATION_RULE_MAX_LENGTH = i18n.translate(
  'xpack.cases.templates.actionsMenu.rule.maxLength',
  { defaultMessage: 'Maximum length' }
);

// Conditional-logic labels
export const CONDITION_SHOW_WHEN = i18n.translate(
  'xpack.cases.templates.actionsMenu.condition.showWhen',
  { defaultMessage: 'Show when…' }
);
export const CONDITION_SHOW_WHEN_COMPOUND = i18n.translate(
  'xpack.cases.templates.actionsMenu.condition.showWhenCompound',
  { defaultMessage: 'Show when (multiple conditions)…' }
);
export const CONDITION_REQUIRED_WHEN = i18n.translate(
  'xpack.cases.templates.actionsMenu.condition.requiredWhen',
  { defaultMessage: 'Require when…' }
);
