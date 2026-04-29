/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../translations';

export const MESSAGE_NOT_DEFINED = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageNotDefined',
  { defaultMessage: '[message]: expected value of type [string] but got [undefined]' }
);

export const MESSAGE_NON_WHITESPACE = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageNotWhitespace',
  { defaultMessage: '[message]: must be populated with a value other than just whitespace' }
);

export const LOADING_JSON_EDITOR = i18n.translate(
  'xpack.stackConnectors.sections.ospgenie.loadingJsonEditor',
  { defaultMessage: 'Loading JSON editor' }
);

export const MESSAGE_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.messageLabel',
  {
    defaultMessage: 'Message',
  }
);

export const DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const USE_JSON_EDITOR_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.useJsonEditorLabel',
  {
    defaultMessage: 'Use JSON editor',
  }
);

export const ALERT_FIELDS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.alertFieldsLabel',
  {
    defaultMessage: 'Alert fields',
  }
);

export const JSON_EDITOR_ARIA = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.jsonEditorAriaLabel',
  {
    defaultMessage: 'JSON editor',
  }
);

export const ENTITY_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.entityLabel',
  {
    defaultMessage: 'Entity',
  }
);

export const TAGS_HELP = i18n.translate('xpack.stackConnectors.components.opsgenie.tagsHelp', {
  defaultMessage: 'Press enter after each tag to begin a new one.',
});

export const TAGS_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.tagsLabel',
  { defaultMessage: 'Opsgenie tags' }
);

export const PRIORITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.priorityLabel',
  {
    defaultMessage: 'Priority',
  }
);

export const PRIORITY_1 = i18n.translate('xpack.stackConnectors.components.opsgenie.priority1', {
  defaultMessage: 'P1-Critical',
});

export const PRIORITY_2 = i18n.translate('xpack.stackConnectors.components.opsgenie.priority2', {
  defaultMessage: 'P2-High',
});

export const PRIORITY_3 = i18n.translate('xpack.stackConnectors.components.opsgenie.priority3', {
  defaultMessage: 'P3-Moderate',
});

export const PRIORITY_4 = i18n.translate('xpack.stackConnectors.components.opsgenie.priority4', {
  defaultMessage: 'P4-Low',
});

export const PRIORITY_5 = i18n.translate('xpack.stackConnectors.components.opsgenie.priority5', {
  defaultMessage: 'P5-Information',
});

export const RULE_TAGS_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.ruleTagsDescription',
  {
    defaultMessage: 'The tags of the rule.',
  }
);

export const REQUIRED_LABEL = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.requiredLabel',
  {
    defaultMessage: 'Required',
  }
);
