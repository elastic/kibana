/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.settingsTitle',
  {
    defaultMessage: 'Conversations',
  }
);

export const CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.connectorTitle',
  {
    defaultMessage: 'Connector',
  }
);

export const SETTINGS_PROMPT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.promptTitle',
  {
    defaultMessage: 'System Prompt',
  }
);

export const SETTINGS_PROMPT_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.promptHelpTextTitle',
  {
    defaultMessage: 'Context provided as part of every conversation.',
  }
);

export const STREAMING_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.streamingTitle',
  {
    defaultMessage: 'Streaming',
  }
);

export const STREAMING_HELP_TEXT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.settings.streamingHelpTextTitle',
  {
    defaultMessage: 'Controls whether streaming responses are used in conversations',
  }
);
