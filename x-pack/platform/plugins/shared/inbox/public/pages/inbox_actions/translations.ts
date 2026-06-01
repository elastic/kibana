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

export const COLUMN_ACTIONS = i18n.translate('xpack.inbox.actionsPage.column.actions', {
  defaultMessage: 'Actions',
});

export const RESPOND_ACTION_LABEL = i18n.translate('xpack.inbox.actionsPage.respondAction', {
  defaultMessage: 'Respond',
});

export const RESPOND_ACTION_DESCRIPTION = i18n.translate(
  'xpack.inbox.actionsPage.respondActionDescription',
  {
    defaultMessage: 'Open the response form for this action',
  }
);

export const FLYOUT_TITLE = i18n.translate('xpack.inbox.actionsPage.flyout.title', {
  defaultMessage: 'Respond to action',
});

export const FLYOUT_SUBMIT = i18n.translate('xpack.inbox.actionsPage.flyout.submit', {
  defaultMessage: 'Submit',
});

export const FLYOUT_CANCEL = i18n.translate('xpack.inbox.actionsPage.flyout.cancel', {
  defaultMessage: 'Cancel',
});

export const FLYOUT_NO_SCHEMA_BODY = i18n.translate('xpack.inbox.actionsPage.flyout.noSchemaBody', {
  defaultMessage:
    'This action does not declare an input schema. Submitting will send an empty response.',
});

export const getFlyoutSubmitErrorMessage = (error: string) =>
  i18n.translate('xpack.inbox.actionsPage.flyout.submitError', {
    defaultMessage: 'Failed to submit response: {error}',
    values: { error },
  });

export const FLYOUT_SUBMIT_SUCCESS = i18n.translate(
  'xpack.inbox.actionsPage.flyout.submitSuccess',
  {
    defaultMessage: 'Response submitted',
  }
);

export const REQUIRED_FIELD_ERROR = i18n.translate('xpack.inbox.actionsPage.requiredFieldError', {
  defaultMessage: 'This field is required',
});

export const SELECT_PLACEHOLDER = i18n.translate('xpack.inbox.actionsPage.selectPlaceholder', {
  defaultMessage: 'Select a value',
});

export const TIMEOUT_EXPIRED_LABEL = i18n.translate('xpack.inbox.actionsPage.timeoutChip.expired', {
  defaultMessage: 'Timed out',
});

export const getTimeoutRemainingLabel = (remaining: string) =>
  i18n.translate('xpack.inbox.actionsPage.timeoutChip.remaining', {
    defaultMessage: 'Timeout in {remaining}',
    values: { remaining },
  });

export const getTimedOutBannerText = (timestamp: string) =>
  i18n.translate('xpack.inbox.actionsPage.timedOutBanner', {
    defaultMessage:
      'This action timed out on {timestamp}. The default response was applied automatically.',
    values: { timestamp },
  });
