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

export const REPLY = i18n.translate('xpack.cases.attachments.comment.thread.reply', {
  defaultMessage: 'Reply',
});

export const getRepliesCount = (count: number) =>
  i18n.translate('xpack.cases.attachments.comment.thread.repliesCount', {
    defaultMessage: '{count, plural, one {# reply} other {# replies}}',
    values: { count },
  });

export const REPLY_IN_THREAD = i18n.translate(
  'xpack.cases.attachments.comment.thread.replyInThread',
  { defaultMessage: 'Reply in thread' }
);

export const THREAD_TITLE = i18n.translate('xpack.cases.attachments.comment.thread.title', {
  defaultMessage: 'Thread',
});

export const NO_REPLIES = i18n.translate('xpack.cases.attachments.comment.thread.noReplies', {
  defaultMessage: 'No replies yet.',
});

export const REPLY_PLACEHOLDER = i18n.translate(
  'xpack.cases.attachments.comment.thread.replyPlaceholder',
  { defaultMessage: 'Reply to this thread. Type @ to mention someone.' }
);

export const REPLY_ARIA_LABEL = i18n.translate(
  'xpack.cases.attachments.comment.thread.replyAriaLabel',
  { defaultMessage: 'Reply' }
);

export const SEND_REPLY = i18n.translate('xpack.cases.attachments.comment.thread.sendReply', {
  defaultMessage: 'Send',
});

export const CANCEL = i18n.translate('xpack.cases.attachments.comment.thread.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE_REPLY = i18n.translate('xpack.cases.attachments.comment.thread.deleteReply', {
  defaultMessage: 'Delete reply',
});

export const DELETE_REPLY_TITLE = i18n.translate(
  'xpack.cases.attachments.comment.thread.deleteReplyTitle',
  { defaultMessage: 'Delete this reply?' }
);

export const DELETE_REPLY_SUCCESS_TOAST = i18n.translate(
  'xpack.cases.attachments.comment.thread.deleteReplySuccessToasterTitle',
  { defaultMessage: 'Deleted reply' }
);

export const getDeleteWithRepliesBody = (count: number) =>
  i18n.translate('xpack.cases.attachments.comment.thread.deleteWithRepliesBody', {
    defaultMessage:
      'Its {count, plural, one {# reply} other {# replies}} will also be deleted. This cannot be undone.',
    values: { count },
  });
