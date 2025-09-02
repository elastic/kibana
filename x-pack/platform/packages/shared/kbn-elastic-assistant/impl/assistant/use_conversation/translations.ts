/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WELCOME_CONVERSATION_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.useConversation.welcomeConversationTitle',
  {
    defaultMessage: 'Welcome',
  }
);

export const DUPLICATE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.duplicate',
  {
    defaultMessage: 'Duplicate',
  }
);

export const DUPLICATE_SUCCESS = (title: string) =>
  i18n.translate('xpack.elasticAssistant.assistant.settings.conversation.duplicateSuccess', {
    defaultMessage: '{title} created successfully',
    values: { title },
  });

export const DUPLICATE_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.duplicateError',
  {
    defaultMessage: 'Could not duplicate conversation',
  }
);

export const COPY_URL_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copySuccess',
  {
    defaultMessage: 'Conversation URL copied to clipboard',
  }
);
export const COPY_URL_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copyError',
  {
    defaultMessage: 'Could not copy conversation URL',
  }
);

export const COPY_URL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copyUrl',
  {
    defaultMessage: 'Copy URL',
  }
);
