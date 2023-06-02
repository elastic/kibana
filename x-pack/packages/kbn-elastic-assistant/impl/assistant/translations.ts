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
    defaultMessage: 'Elastic Assistant',
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

export const SUBMIT_MESSAGE = i18n.translate('xpack.elasticAssistant.assistant.submitMessage', {
  defaultMessage: 'Submit message',
});
