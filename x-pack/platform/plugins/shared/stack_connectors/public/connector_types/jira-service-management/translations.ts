/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.apiUrlLabel',
  {
    defaultMessage: 'API URL',
  }
);

export const API_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.apiKeySecret',
  {
    defaultMessage: 'API Key',
  }
);

export const MESSAGE_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.requiredMessageTextField',
  {
    defaultMessage: 'Message is required.',
  }
);

export const MESSAGE_NON_WHITESPACE = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.messageNotWhitespaceForm',
  { defaultMessage: 'Message must be populated with a value other than just whitespace' }
);

export const ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.actionLabel',
  {
    defaultMessage: 'Action',
  }
);

export const CREATE_ALERT_ACTION = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.createAlertAction',
  {
    defaultMessage: 'Create alert',
  }
);

export const CLOSE_ALERT_ACTION = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.closeAlertAction',
  {
    defaultMessage: 'Close alert',
  }
);

export const NOTE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.noteLabel',
  {
    defaultMessage: 'Note',
  }
);

export const ALIAS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.aliasLabel',
  {
    defaultMessage: 'Alias',
  }
);

export const ALIAS_IS_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.requiredAliasTextField',
  {
    defaultMessage: 'Alias is required.',
  }
);

export const MORE_OPTIONS = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.moreOptions',
  {
    defaultMessage: 'More options',
  }
);

export const HIDE_OPTIONS = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.hideOptions',
  {
    defaultMessage: 'Hide options',
  }
);

export const USER_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.userLabel',
  {
    defaultMessage: 'User',
  }
);

export const SOURCE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.sourceLabel',
  {
    defaultMessage: 'Source',
  }
);

export const JSON_EDITOR_ERROR = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.jsonEditorError',
  {
    defaultMessage: 'JSON editor error exists',
  }
);

export const JIRA_SERVICE_MANAGEMENT_DOCUMENTATION = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.documentation',
  {
    defaultMessage: 'JSM documentation',
  }
);

export const JIRA_SERVICE_MANAGEMENT_ALIAS_HELP = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.fieldAliasHelpText',
  {
    defaultMessage: 'The unique alert identifier used for deduplication in JSM.',
  }
);

export const JIRA_SERVICE_MANAGEMENT_ENTITY_HELP = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.fieldEntityHelpText',
  {
    defaultMessage: 'The domain of the alert. For example, the application name.',
  }
);

export const JIRA_SERVICE_MANAGEMENT_SOURCE_HELP = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.fieldSourceHelpText',
  {
    defaultMessage: 'The display name for the source of the alert.',
  }
);

export const JIRA_SERVICE_MANAGEMENT_USER_HELP = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.fieldUserHelpText',
  {
    defaultMessage: 'The display name for the owner.',
  }
);
