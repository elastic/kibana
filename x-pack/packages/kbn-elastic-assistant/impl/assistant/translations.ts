/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CLEAR_CHAT = i18n.translate('xpack.elasticAssistant.assistant.clearChat', {
  defaultMessage: 'Clear chat',
});

export const DEFAULT_ASSISTANT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.defaultAssistantTitle',
  {
    defaultMessage: 'Elastic AI Assistant',
  }
);

export const MISSING_CONNECTOR_CALLOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.missingConnectorCalloutTitle',
  {
    defaultMessage: 'The current conversation is missing a connector configuration',
  }
);

export const MISSING_CONNECTOR_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.missingConnectorCalloutDescription',
  {
    defaultMessage: 'Select a connector from the conversation settings to continue',
  }
);

// Settings
export const SETTINGS_TITLE = i18n.translate('xpack.elasticAssistant.assistant.settingsTitle', {
  defaultMessage: 'Conversation settings',
});

export const SETTINGS_CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.connectorTitle',
  {
    defaultMessage: 'Connector',
  }
);

export const SETTINGS_PROMPT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.promptTitle',
  {
    defaultMessage: 'System prompt',
  }
);

export const SETTINGS_PROMPT_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.promptHelpTextTitle',
  {
    defaultMessage: 'Context provided before every conversation',
  }
);

export const SHOW_ANONYMIZED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showAnonymizedToggleLabel',
  {
    defaultMessage: 'Show anonymized',
  }
);

export const SHOW_ANONYMIZED_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showAnonymizedTooltip',
  {
    defaultMessage: 'Show the anonymized values sent to and from the assistant',
  }
);

export const SUBMIT_MESSAGE = i18n.translate('xpack.elasticAssistant.assistant.submitMessage', {
  defaultMessage: 'Submit message',
});

export const API_ERROR = i18n.translate('xpack.elasticAssistant.assistant.apiErrorTitle', {
  defaultMessage:
    'An error occurred sending your message. If the problem persists, please test the connector configuration.',
});
