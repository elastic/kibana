/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DELETE_CONVERSATION_ARIA_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.sidePanel.deleteConversationAriaLabel',
  {
    defaultMessage: 'Delete conversation',
  }
);

export const NEW_CHAT = i18n.translate(
  'xpack.elasticAssistant.assistant.conversations.sidePanel.newChatButtonLabel',
  {
    defaultMessage: 'New chat',
  }
);

export const DELETE_CONVERSATION_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.deleteConversationModal.deleteConversationTitle',
  {
    defaultMessage: 'Delete this conversation',
  }
);

export const CANCEL_BUTTON_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.deleteConversationModal.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

export const DELETE_BUTTON_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.deleteConversationModal.deleteButtonText',
  {
    defaultMessage: 'Delete',
  }
);

export const DATE_CATEGORY_LABELS: Record<string, string> = {
  TODAY: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.today', {
    defaultMessage: 'Today',
  }),
  YESTERDAY: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.yesterday', {
    defaultMessage: 'Yesterday',
  }),
  THIS_WEEK: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.thisWeek', {
    defaultMessage: 'This Week',
  }),
  LAST_WEEK: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.lastWeek', {
    defaultMessage: 'Last Week',
  }),
  THIS_MONTH: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.thisMonth', {
    defaultMessage: 'This Month',
  }),
  LAST_MONTH: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.lastMonth', {
    defaultMessage: 'Last Month',
  }),
  THIS_YEAR: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.thisYear', {
    defaultMessage: 'This Year',
  }),
  OLDER: i18n.translate('xpack.elasticAssistant.conversationList.dateGroupTitle.older', {
    defaultMessage: 'Older',
  }),
};
