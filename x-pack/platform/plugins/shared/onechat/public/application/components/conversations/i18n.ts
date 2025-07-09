/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const chatCommonLabels = {
  chat: {
    conversations: {
      conversationsListTitle: i18n.translate(
        'xpack.onechat.chat.conversations.conversationListTitle',
        {
          defaultMessage: 'Conversations',
        }
      ),
      newConversationLabel: i18n.translate(
        'xpack.onechat.chat.conversations.newConversationLabel',
        {
          defaultMessage: 'New conversation',
        }
      ),
    },
  },

  userInputBox: {
    placeholder: i18n.translate('xpack.onechat.userInputBox.placeholder', {
      defaultMessage: 'Ask anything',
    }),
  },
  assistant: {
    defaultNameLabel: i18n.translate('xpack.onechat.assistant.defaultNameLabel', {
      defaultMessage: 'Assistant',
    }),
  },
  assistantStatus: {
    healthy: i18n.translate('xpack.onechat.chat.assistantStatus.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
};
