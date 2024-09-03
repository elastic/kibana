/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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
      'Ask me anything from "Summarize this alert" to "Help me build a query" using the following system prompt:',
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

export const DISCLAIMER = i18n.translate('xpack.elasticAssistant.assistant.disclaimer', {
  defaultMessage:
    'Responses from Al systems may not always be entirely accurate, although they can seem convincing. For more information on the assistant feature and its usage, please reference the documentation.',
});
