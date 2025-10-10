/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../translations';

export const MESSAGE_NOT_DEFINED = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.messageNotDefined',
  { defaultMessage: '[message]: expected value of type [string] but got [undefined]' }
);

export const MESSAGE_NON_WHITESPACE = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.messageNotWhitespace',
  { defaultMessage: '[message]: must be populated with a value other than just whitespace' }
);

export const LOADING_JSON_EDITOR = i18n.translate(
  'xpack.stackConnectors.sections.jiraServiceManagement.loadingJsonEditor',
  { defaultMessage: 'Loading JSON editor' }
);

export const MESSAGE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.messageLabel',
  {
    defaultMessage: 'Message',
  }
);

export const DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const USE_JSON_EDITOR_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.useJsonEditorLabel',
  {
    defaultMessage: 'Use JSON editor',
  }
);

export const ALERT_FIELDS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.alertFieldsLabel',
  {
    defaultMessage: 'Alert fields',
  }
);

export const JSON_EDITOR_ARIA = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.jsonEditorAriaLabel',
  {
    defaultMessage: 'JSON editor',
  }
);

export const ENTITY_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.entityLabel',
  {
    defaultMessage: 'Entity',
  }
);

export const TAGS_HELP = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.tagsHelp',
  {
    defaultMessage: 'Press enter after each tag to begin a new one.',
  }
);

export const TAGS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.tagsLabel',
  { defaultMessage: 'JSM tags' }
);

export const PRIORITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priorityLabel',
  {
    defaultMessage: 'Priority',
  }
);

export const PRIORITY_1 = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priority1',
  {
    defaultMessage: 'P1-Critical',
  }
);

export const PRIORITY_2 = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priority2',
  {
    defaultMessage: 'P2-High',
  }
);

export const PRIORITY_3 = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priority3',
  {
    defaultMessage: 'P3-Moderate',
  }
);

export const PRIORITY_4 = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priority4',
  {
    defaultMessage: 'P4-Low',
  }
);

export const PRIORITY_5 = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.priority5',
  {
    defaultMessage: 'P5-Information',
  }
);

export const RULE_TAGS_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.jiraServiceManagement.ruleTagsDescription',
  {
    defaultMessage: 'The tags of the rule.',
  }
);
