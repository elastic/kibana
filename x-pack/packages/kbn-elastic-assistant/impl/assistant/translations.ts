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

export const SUBMIT_MESSAGE = i18n.translate('xpack.elasticAssistant.assistant.submitMessage', {
  defaultMessage: 'Submit message',
});

export const API_ERROR = i18n.translate('xpack.elasticAssistant.assistant.apiErrorTitle', {
  defaultMessage: 'An error occurred sending your message.',
});

export const TOOLTIP_ARIA_LABEL = i18n.translate(
  'xpack.elasticAssistant.documentationLinks.ariaLabel',
  {
    defaultMessage: 'Click to open Elastic Assistant documentation in a new tab',
  }
);

export const DOCUMENTATION = i18n.translate(
  'xpack.elasticAssistant.documentationLinks.documentation',
  {
    defaultMessage: 'documentation',
  }
);

export const EMPTY_SCREEN_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.emptyScreen.title',
  {
    defaultMessage: 'How I can help you?',
  }
);

export const EMPTY_SCREEN_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.emptyScreen.description',
  {
    defaultMessage:
      'Ask me anything from <strong>Summarize this alert</strong> to <strong>Help me build a query</strong> using the following system prompt:',
  }
);

export const WELCOME_SCREEN_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.welcomeScreen.title',
  {
    defaultMessage: 'Welcome to Security AI Assistant!',
  }
);

export const WELCOME_SCREEN_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.welcomeScreen.description',
  {
    defaultMessage:
      "First things first, we'll need to set up a Generative AI Connector to get this chat experience going!",
  }
);
