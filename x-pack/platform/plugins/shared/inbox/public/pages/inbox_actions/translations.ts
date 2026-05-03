/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.inbox.actionsPage.title', {
  defaultMessage: 'Inbox',
});

export const PAGE_DESCRIPTION = i18n.translate('xpack.inbox.actionsPage.description', {
  defaultMessage:
    'Review and action items that agents across Kibana have paused for human approval.',
});

export const COLUMN_TITLE = i18n.translate('xpack.inbox.actionsPage.column.title', {
  defaultMessage: 'Action',
});

export const COLUMN_STATUS = i18n.translate('xpack.inbox.actionsPage.column.status', {
  defaultMessage: 'Status',
});

export const COLUMN_SOURCE = i18n.translate('xpack.inbox.actionsPage.column.source', {
  defaultMessage: 'Source',
});

export const COLUMN_REQUESTED_BY = i18n.translate('xpack.inbox.actionsPage.column.requestedBy', {
  defaultMessage: 'Requested by',
});

export const COLUMN_CREATED_AT = i18n.translate('xpack.inbox.actionsPage.column.createdAt', {
  defaultMessage: 'Created',
});

export const STATUS_PENDING = i18n.translate('xpack.inbox.actionsPage.status.pending', {
  defaultMessage: 'Pending',
});

export const STATUS_APPROVED = i18n.translate('xpack.inbox.actionsPage.status.approved', {
  defaultMessage: 'Approved',
});

export const STATUS_REJECTED = i18n.translate('xpack.inbox.actionsPage.status.rejected', {
  defaultMessage: 'Rejected',
});

export const EMPTY_TITLE = i18n.translate('xpack.inbox.actionsPage.empty.title', {
  defaultMessage: 'No inbox actions',
});

export const EMPTY_BODY = i18n.translate('xpack.inbox.actionsPage.empty.body', {
  defaultMessage: 'Agents will drop approval requests here when they need a human to weigh in.',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.inbox.actionsPage.loadError.title', {
  defaultMessage: 'Unable to load inbox actions',
});

export const RETRY_BUTTON = i18n.translate('xpack.inbox.actionsPage.retryButton', {
  defaultMessage: 'Retry',
});

export const TABLE_CAPTION = i18n.translate('xpack.inbox.actionsPage.tableCaption', {
  defaultMessage: 'Inbox actions awaiting review',
});

export const getLoadErrorBody = (error: string) =>
  i18n.translate('xpack.inbox.actionsPage.loadError.body', {
    defaultMessage: 'Something went wrong while fetching inbox actions: {error}',
    values: { error },
  });
