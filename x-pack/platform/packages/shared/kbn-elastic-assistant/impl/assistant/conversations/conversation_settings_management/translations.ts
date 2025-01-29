/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATIONS_SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.title',
  {
    defaultMessage: 'Settings',
  }
);

export const CONVERSATIONS_LIST_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.list.title',
  {
    defaultMessage: 'Conversation list',
  }
);

export const CONVERSATIONS_LIST_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.list.description',
  {
    defaultMessage: 'Create and manage conversations with the Elastic AI Assistant.',
  }
);

export const CONVERSATIONS_TABLE_COLUMN_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.column.Title',
  {
    defaultMessage: 'Title',
  }
);

export const CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.column.systemPrompt',
  {
    defaultMessage: 'System prompt',
  }
);

export const CONVERSATIONS_TABLE_COLUMN_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.column.connector',
  {
    defaultMessage: 'Connector',
  }
);

export const CONVERSATIONS_TABLE_COLUMN_UPDATED_AT = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.column.updatedAt',
  {
    defaultMessage: 'Date updated',
  }
);

export const CONVERSATIONS_FLYOUT_DEFAULT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.flyout.defaultTitle',
  {
    defaultMessage: 'Conversation',
  }
);

export const DELETE_CONVERSATION_CONFIRMATION_DEFAULT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.conversationSettings.deleteConfirmation.defaultTitle',
  {
    defaultMessage: 'Delete conversation?',
  }
);

export const DELETE_CONVERSATION_CONFIRMATION_TITLE = (conversationTitle: string) =>
  i18n.translate('xpack.elasticAssistant.assistant.conversationSettings.deleteConfirmation.Title', {
    values: { conversationTitle },
    defaultMessage: 'Delete "{conversationTitle}"?',
  });
