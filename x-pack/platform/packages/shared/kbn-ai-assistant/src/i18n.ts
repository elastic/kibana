/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSISTANT_SETUP_TITLE = i18n.translate('xpack.aiAssistant.assistantSetup.title', {
  defaultMessage: 'Welcome to the Elastic AI Assistant',
});

export const EMPTY_CONVERSATION_TITLE = i18n.translate('xpack.aiAssistant.emptyConversationTitle', {
  defaultMessage: 'New conversation',
});

export const UPGRADE_LICENSE_TITLE = i18n.translate('xpack.aiAssistant.incorrectLicense.title', {
  defaultMessage: 'Upgrade your license',
});

export const DATE_CATEGORY_LABELS: Record<string, string> = {
  TODAY: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.today', {
    defaultMessage: 'Today',
  }),
  YESTERDAY: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.yesterday', {
    defaultMessage: 'Yesterday',
  }),
  THIS_WEEK: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.thisWeek', {
    defaultMessage: 'This Week',
  }),
  LAST_WEEK: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.lastWeek', {
    defaultMessage: 'Last Week',
  }),
  THIS_MONTH: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.thisMonth', {
    defaultMessage: 'This Month',
  }),
  LAST_MONTH: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.lastMonth', {
    defaultMessage: 'Last Month',
  }),
  THIS_YEAR: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.thisYear', {
    defaultMessage: 'This Year',
  }),
  OLDER: i18n.translate('xpack.aiAssistant.conversationList.dateGroupTitle.older', {
    defaultMessage: 'Older',
  }),
};
