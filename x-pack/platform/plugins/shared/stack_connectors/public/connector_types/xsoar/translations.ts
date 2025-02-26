/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URL_LABEL = i18n.translate('xpack.stackConnectors.components.xsoar.urlFieldLabel', {
  defaultMessage: 'URL',
});

export const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.xsoar.selectMessageText',
  {
    defaultMessage: 'Create an incident in XSOAR',
  }
);

export const API_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.apiKeyFieldLabel',
  {
    defaultMessage: 'API key',
  }
);

export const API_KEY_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.apiKeyIDFieldLabel',
  {
    defaultMessage: 'API key ID',
  }
);

export const API_KEY_ID_HELP_TEXT = i18n.translate(
  'xpack.stackConnectors.components.xsoar.apiKeyIDFieldHelpText',
  {
    defaultMessage:
      'For the cloud instance, the API Key ID is required, that is your unique token used to authenticate the API Key.',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.nameFieldLabel',
  {
    defaultMessage: 'Name',
  }
);

export const NAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.error.requiredNameText',
  {
    defaultMessage: 'Incident name is required.',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.error.requiredBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);

export const START_INVESTIGATION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.startInvestigationToggleLabel',
  {
    defaultMessage: 'Start investigation',
  }
);

export const SEVERITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.severitySelectInputLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const IS_RULE_SEVERITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.isRuleSeverityToggleLabel',
  {
    defaultMessage: 'Keep severity from rule',
  }
);

export const PLAYBOOKS_ERROR = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.componentError.playbooksRequestFailed',
  {
    defaultMessage: 'Error retrieving playbooks from XSOAR',
  }
);

export const PLAYBOOK_NOT_FOUND_WARNING = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.componentWarning.playbookNotFound',
  {
    defaultMessage:
      'Cannot find the saved playbook. Please select a valid playbook from the selector',
  }
);

export const BODY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.bodyFieldLabel',
  {
    defaultMessage: 'Body',
  }
);

export const BODY_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const PLAYBOOK_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.playbookFieldLabel',
  {
    defaultMessage: 'XSOAR Playbooks',
  }
);

export const PLAYBOOK_HELP = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.playbookHelp',
  {
    defaultMessage: 'The XSOAR playbook to associate with incident.',
  }
);

export const PLAYBOOK_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.playbookPlaceholder',
  {
    defaultMessage: 'Select a playbook',
  }
);

export const PLAYBOOK_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xsoar.params.playbookFieldAriaLabel',
  {
    defaultMessage: 'Select a XSOAR playbook',
  }
);
