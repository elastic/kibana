/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const conversationsCommonLabels = {
  content: {
    newConversationPrompt: {
      title: i18n.translate('xpack.onechat.newConversationPrompt', {
        defaultMessage: 'How can I help today?',
      }),
      subtitle: i18n.translate('xpack.onechat.newConversationPrompt', {
        defaultMessage:
          'Whether you’re starting something new or jumping back into an old thread, I am ready when you are 💪',
      }),
    },
  },
  header: {
    newConversationTitle: i18n.translate('xpack.onechat.newConversationTitle', {
      defaultMessage: 'New conversation',
    }),
    createNewConversationButtonLabel: i18n.translate(
      'xpack.onechat.createNewConversationButtonLabel',
      { defaultMessage: 'New' }
    ),
    actionsMenuTitle: i18n.translate('xpack.onechat.actionsMenuTitle', {
      defaultMessage: 'Actions',
    }),
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
