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

export const PROMPT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.promptPlaceholder',
  {
    defaultMessage:
      "Ask a question! You can ask anything from things like 'check this hash xxxx' or 'help me with a query I need to build'.",
  }
);

export const CHAT_COMPLETION_FETCH_FAILURE = i18n.translate(
  'xpack.elasticAssistant.assistant.chatCompletion.fetchFailureTitle',
  {
    defaultMessage: 'An error occurred fetching chat completion.',
  }
);

// Settings
export const SETTINGS_TITLE = i18n.translate('xpack.elasticAssistant.assistant.settingsTitle', {
  defaultMessage: 'Assistant Settings',
});

export const SETTINGS_TEMPERATURE_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.temperatureTitle',
  {
    defaultMessage: 'Temperature',
  }
);

export const SETTINGS_TEMPERATURE_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.temperatureHelpTextTitle',
  {
    defaultMessage:
      'What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.',
  }
);

export const SETTINGS_CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.connectorTitle',
  {
    defaultMessage: 'Connector',
  }
);
export const SETTINGS_CONNECTOR_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.connectorHelpTextTitle',
  {
    defaultMessage: 'Kibana Connector to make requests with',
  }
);

export const SETTINGS_MODEL_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.modelTitle',
  {
    defaultMessage: 'Model',
  }
);

export const SETTINGS_MODEL_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.modelHelpTextTitle',
  {
    defaultMessage: 'ID of the model to use. ',
  }
);

export const SETTINGS_PROMPT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.promptTitle',
  {
    defaultMessage: 'System Prompt',
  }
);

export const SETTINGS_PROMPT_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.promptHelpTextTitle',
  {
    defaultMessage: 'Context provided before every conversations',
  }
);

export const SUBMIT_MESSAGE = i18n.translate('xpack.elasticAssistant.assistant.submitMessage', {
  defaultMessage: 'Submit message',
});
