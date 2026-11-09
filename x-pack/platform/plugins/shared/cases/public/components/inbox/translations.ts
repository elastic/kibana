/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_TAB = i18n.translate('xpack.cases.inbox.casesTab', {
  defaultMessage: 'Cases',
});

export const INBOX_TAB = i18n.translate('xpack.cases.inbox.inboxTab', {
  defaultMessage: 'Inbox',
});

export const getUnreadCount = (count: number) =>
  i18n.translate('xpack.cases.inbox.unreadCountAriaLabel', {
    defaultMessage: '{count, plural, one {# unread item} other {# unread items}}',
    values: { count },
  });

export const UNREAD = i18n.translate('xpack.cases.inbox.unread', {
  defaultMessage: 'Unread',
});

export const MARK_ALL_READ = i18n.translate('xpack.cases.inbox.markAllRead', {
  defaultMessage: 'Mark all as read',
});

export const EMPTY_TITLE = i18n.translate('xpack.cases.inbox.emptyTitle', {
  defaultMessage: 'Your inbox is empty',
});

export const EMPTY_BODY = i18n.translate('xpack.cases.inbox.emptyBody', {
  defaultMessage:
    'When someone mentions you with @, replies to your comment, or assigns you to a case, it shows up here.',
});
