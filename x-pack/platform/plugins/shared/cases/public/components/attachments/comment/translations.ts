/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMMENT = i18n.translate('xpack.cases.attachments.comment.displayName', {
  defaultMessage: 'Comments',
});

export const ADDED_COMMENT = i18n.translate('xpack.cases.attachments.comment.addedComment', {
  defaultMessage: 'added a comment',
});

export const LAST_EDITED = i18n.translate('xpack.cases.attachments.comment.lastEdited', {
  defaultMessage: 'Last edited',
});

export const getLastEditedBy = (user: string) =>
  i18n.translate('xpack.cases.attachments.comment.lastEditedBy', {
    defaultMessage: 'Last edited by {user}',
    values: { user },
  });

export const EDIT_HISTORY_TITLE = i18n.translate(
  'xpack.cases.attachments.comment.editHistoryTitle',
  {
    defaultMessage: 'Edit history',
  }
);

export const EDIT_HISTORY_ARIA_LABEL = i18n.translate(
  'xpack.cases.attachments.comment.editHistoryAriaLabel',
  { defaultMessage: 'Show edit history' }
);

export const ORIGINAL_VERSION = i18n.translate('xpack.cases.attachments.comment.originalVersion', {
  defaultMessage: 'Original',
});

export const CURRENT_VERSION = i18n.translate('xpack.cases.attachments.comment.currentVersion', {
  defaultMessage: 'Current',
});

export const DELETE_COMMENT_SUCCESS_TOAST = i18n.translate(
  'xpack.cases.attachments.comment.deleteSuccessToasterTitle',
  { defaultMessage: 'Deleted comment' }
);

export const REMOVED_COMMENT_LABEL_TITLE = i18n.translate(
  'xpack.cases.attachments.comment.removedCommentLabelTitle',
  { defaultMessage: 'removed comment' }
);
