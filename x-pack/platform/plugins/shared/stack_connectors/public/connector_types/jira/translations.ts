/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jira.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const JIRA_PROJECT_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jira.projectKey',
  {
    defaultMessage: 'Project key',
  }
);

export const JIRA_EMAIL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jira.emailTextFieldLabel',
  {
    defaultMessage: 'Email address',
  }
);

export const JIRA_API_TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jira.apiTokenTextFieldLabel',
  {
    defaultMessage: 'API token',
  }
);

export const SUMMARY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.jira.requiredSummaryTextField',
  {
    defaultMessage: 'Summary is required.',
  }
);

export const ISSUE_TYPES_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.jira.unableToGetIssueTypesMessage',
  {
    defaultMessage: 'Unable to get issue types',
  }
);

export const FIELDS_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.jira.unableToGetFieldsMessage',
  {
    defaultMessage: 'Unable to get fields',
  }
);

export const ISSUES_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.jira.unableToGetIssuesMessage',
  {
    defaultMessage: 'Unable to get issues',
  }
);

export const GET_ISSUE_API_ERROR = (id: string) =>
  i18n.translate('xpack.stackConnectors.components.jira.unableToGetIssueMessage', {
    defaultMessage: 'Unable to get issue with id {id}',
    values: { id },
  });

export const SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jira.searchIssuesComboBoxAriaLabel',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.components.jira.searchIssuesComboBoxPlaceholder',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_LOADING = i18n.translate(
  'xpack.stackConnectors.components.jira.searchIssuesLoading',
  {
    defaultMessage: 'Loading...',
  }
);

export const LABELS_WHITE_SPACES = i18n.translate(
  'xpack.stackConnectors.components.jira.labelsSpacesErrorMessage',
  {
    defaultMessage: 'Labels cannot contain spaces.',
  }
);

export const INVALID_JSON_FORMAT = i18n.translate(
  'xpack.stackConnectors.components.jira.otherFieldsFormatErrorMessage',
  {
    defaultMessage: 'Additional fields field must be a valid JSON object.',
  }
);

export const OTHER_FIELDS_LENGTH_ERROR = (length: number) =>
  i18n.translate('xpack.stackConnectors.jira.schema.additionalFieldsLengthError', {
    values: { length },
    defaultMessage: 'A maximum of {length} additional fields can be defined at a time.',
  });
