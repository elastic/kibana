/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const BACK_TO_TEMPLATES = i18n.translate('xpack.cases.templates.backToTemplates', {
  defaultMessage: 'Back to Templates',
});

export const TEMPLATE_FIELDS_LABEL = i18n.translate('xpack.cases.templates.templateFieldsLabel', {
  defaultMessage: 'Fields',
});

export const TEMPLATE_SAVED = i18n.translate('xpack.cases.templates.templateSaved', {
  defaultMessage: 'Saved',
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
