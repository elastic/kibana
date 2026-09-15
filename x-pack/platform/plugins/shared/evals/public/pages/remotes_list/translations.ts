/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.evals.remotesListPage.pageTitle', {
  defaultMessage: 'Remotes',
});

export const REMOTES_TABLE_CAPTION = i18n.translate(
  'xpack.evals.remotesListPage.remotesTableCaption',
  {
    defaultMessage: 'Remote Kibana connections',
  }
);

export const CREATE_REMOTE_BUTTON = i18n.translate(
  'xpack.evals.remotesListPage.createRemoteButton',
  {
    defaultMessage: 'Add remote',
  }
);

export const COLUMN_NAME = i18n.translate('xpack.evals.remotesListPage.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_URL = i18n.translate('xpack.evals.remotesListPage.columns.url', {
  defaultMessage: 'URL',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.evals.remotesListPage.columns.actions', {
  defaultMessage: 'Actions',
});

export const CREATE_FLYOUT_TITLE = i18n.translate('xpack.evals.remotesListPage.createFlyoutTitle', {
  defaultMessage: 'Add remote',
});

export const EDIT_FLYOUT_TITLE = i18n.translate('xpack.evals.remotesListPage.editFlyoutTitle', {
  defaultMessage: 'Edit remote',
});

export const FIELD_DISPLAY_NAME_LABEL = i18n.translate(
  'xpack.evals.remotesListPage.fields.displayNameLabel',
  { defaultMessage: 'Name' }
);

export const FIELD_URL_LABEL = i18n.translate('xpack.evals.remotesListPage.fields.urlLabel', {
  defaultMessage: 'Kibana URL',
});

export const FIELD_API_KEY_LABEL = i18n.translate(
  'xpack.evals.remotesListPage.fields.apiKeyLabel',
  {
    defaultMessage: 'API key',
  }
);

export const FIELD_API_KEY_EDIT_HELP = i18n.translate(
  'xpack.evals.remotesListPage.fields.apiKeyEditHelp',
  { defaultMessage: 'Leave blank to keep the existing API key.' }
);

export const CANCEL_BUTTON = i18n.translate('xpack.evals.remotesListPage.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE_BUTTON = i18n.translate('xpack.evals.remotesListPage.saveButton', {
  defaultMessage: 'Save',
});

export const DELETE_BUTTON = i18n.translate('xpack.evals.remotesListPage.deleteButton', {
  defaultMessage: 'Delete',
});

export const EDIT_BUTTON = i18n.translate('xpack.evals.remotesListPage.editButton', {
  defaultMessage: 'Edit',
});

export const DELETE_CONFIRM_TITLE = i18n.translate(
  'xpack.evals.remotesListPage.deleteConfirmTitle',
  {
    defaultMessage: 'Delete remote?',
  }
);

export const DELETE_CONFIRM_MESSAGE = i18n.translate(
  'xpack.evals.remotesListPage.deleteConfirmMessage',
  { defaultMessage: 'This will remove the stored URL and API key for this remote.' }
);

export const DISPLAY_NAME_REQUIRED = i18n.translate(
  'xpack.evals.remotesListPage.errors.nameRequired',
  {
    defaultMessage: 'Name is required.',
  }
);

export const URL_REQUIRED = i18n.translate('xpack.evals.remotesListPage.errors.urlRequired', {
  defaultMessage: 'URL is required.',
});

export const URL_SCHEME_REQUIRED = i18n.translate(
  'xpack.evals.remotesListPage.errors.urlSchemeRequired',
  {
    defaultMessage: 'URL must use HTTPS.',
  }
);

export const URL_INVALID = i18n.translate('xpack.evals.remotesListPage.errors.urlInvalid', {
  defaultMessage: 'Invalid URL format.',
});

export const URL_HOST_REQUIRED = i18n.translate(
  'xpack.evals.remotesListPage.errors.urlHostRequired',
  {
    defaultMessage: 'URL must be an Elastic Cloud deployment (.cloud.es.io or .elastic.cloud).',
  }
);

export const API_KEY_REQUIRED = i18n.translate(
  'xpack.evals.remotesListPage.errors.apiKeyRequired',
  {
    defaultMessage: 'API key is required.',
  }
);

export const LOAD_ERROR_TITLE = i18n.translate('xpack.evals.remotesListPage.loadErrorTitle', {
  defaultMessage: 'Failed to load remotes',
});

export const FORM_ERROR_TITLE = i18n.translate('xpack.evals.remotesListPage.formErrorTitle', {
  defaultMessage: 'Could not save remote',
});

export const DELETE_ERROR_TITLE = i18n.translate('xpack.evals.remotesListPage.deleteErrorTitle', {
  defaultMessage: 'Could not delete remote',
});

export const API_KEY_PLACEHOLDER = i18n.translate('xpack.evals.remotesListPage.apiKeyPlaceholder', {
  defaultMessage: '••••••••',
});

export const API_KEY_HELP_ACCORDION_TITLE = i18n.translate(
  'xpack.evals.remotesListPage.apiKeyHelpAccordionTitle',
  { defaultMessage: 'How to generate an API key' }
);

export const API_KEY_HELP_STEP1 = i18n.translate('xpack.evals.remotesListPage.apiKeyHelpStep1', {
  defaultMessage: 'Open Dev Tools in the remote Kibana instance.',
});

export const API_KEY_HELP_STEP2 = i18n.translate('xpack.evals.remotesListPage.apiKeyHelpStep2', {
  defaultMessage:
    'Paste and run the command below to create an API key with the required dataset privileges.',
});

export const API_KEY_HELP_STEP3 = i18n.translate('xpack.evals.remotesListPage.apiKeyHelpStep3', {
  defaultMessage:
    'Copy the "encoded" value from the response and paste it into the API key field above.',
});

export const FIELD_URL_HELP = i18n.translate('xpack.evals.remotesListPage.fields.urlHelp', {
  defaultMessage:
    'Elastic Cloud Kibana URL. Must use HTTPS and end with .cloud.es.io or .elastic.cloud.',
});

export const FIELD_URL_PLACEHOLDER = i18n.translate(
  'xpack.evals.remotesListPage.fields.urlPlaceholder',
  {
    defaultMessage: 'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud',
  }
);

export const TEST_CONNECTION_BUTTON = i18n.translate(
  'xpack.evals.remotesListPage.testConnectionButton',
  { defaultMessage: 'Test connection' }
);

export const TEST_CONNECTION_SUCCESS = i18n.translate(
  'xpack.evals.remotesListPage.testConnectionSuccess',
  { defaultMessage: 'Connection successful!' }
);

export const TEST_CONNECTION_FAILURE = i18n.translate(
  'xpack.evals.remotesListPage.testConnectionFailure',
  { defaultMessage: 'Connection failed' }
);
