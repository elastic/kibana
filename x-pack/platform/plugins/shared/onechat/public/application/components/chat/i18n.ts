/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const chatCommonLabels = {
  newConversationLabel: i18n.translate('workchatApp.chat.conversations.newConversationLabel', {
    defaultMessage: 'New conversation',
  }),
  userInputBox: {
    placeholder: i18n.translate('xpack.workchatApp.chatInputForm.placeholder', {
      defaultMessage: 'Ask anything',
    }),
  },
  assistant: {
    defaultNameLabel: i18n.translate('xpack.workchatApp.assistant.defaultNameLabel', {
      defaultMessage: 'Assistant',
    }),
  },
  assistantStatus: {
    healthy: i18n.translate('workchatApp.chat.assistantStatus.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
};
