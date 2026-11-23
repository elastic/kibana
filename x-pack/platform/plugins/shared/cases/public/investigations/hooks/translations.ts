/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.createRecordError',
  { defaultMessage: 'Could not create the investigation' }
);

export const CREATE_RECORD_SUCCESS = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.hooks.createRecordSuccess', {
    defaultMessage: '{displayId} created.',
    values: { displayId },
  });

export const UPDATE_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.updateRecordError',
  { defaultMessage: 'Could not update the investigation' }
);

export const CLOSE_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.closeRecordError',
  { defaultMessage: 'Could not close the investigation' }
);

export const CLOSE_RECORD_SUCCESS = i18n.translate(
  'xpack.cases.investigations.hooks.closeRecordSuccess',
  { defaultMessage: 'Investigation closed.' }
);

export const REOPEN_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.reopenRecordError',
  { defaultMessage: 'Could not reopen the investigation' }
);

export const REOPEN_RECORD_SUCCESS = i18n.translate(
  'xpack.cases.investigations.hooks.reopenRecordSuccess',
  { defaultMessage: 'Investigation reopened.' }
);

export const MERGE_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.mergeRecordError',
  { defaultMessage: 'Could not merge the investigations' }
);

export const MERGE_RECORD_SUCCESS = i18n.translate(
  'xpack.cases.investigations.hooks.mergeRecordSuccess',
  { defaultMessage: 'Investigations merged.' }
);

export const APPLY_PROCEDURE_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.applyProcedureError',
  { defaultMessage: 'Could not apply the task list' }
);

export const CREATE_THREAD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.createThreadError',
  { defaultMessage: 'Could not start the thread' }
);

export const ITEMS_ERROR = i18n.translate('xpack.cases.investigations.hooks.itemsError', {
  defaultMessage: 'Could not save the change',
});

export const ITEM_CONFLICT_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.itemConflictError',
  {
    defaultMessage:
      'Someone else changed this item first. Review the latest version and try again.',
  }
);

export const DELETE_ITEMS_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.deleteItemsError',
  { defaultMessage: 'Could not delete the items' }
);

export const IMPORT_INDICATORS_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.importIndicatorsError',
  { defaultMessage: 'Could not import the indicators' }
);

export const PRESERVE_EVIDENCE_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.preserveEvidenceError',
  { defaultMessage: 'Could not preserve the evidence' }
);

export const UPLOAD_FILE_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.uploadFileError',
  { defaultMessage: 'Could not upload the file' }
);

export const CREATE_ACTIVITY_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.createActivityError',
  { defaultMessage: 'Could not add the activity entry' }
);

export const UPDATE_TEMPLATE_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.updateTemplateError',
  { defaultMessage: 'Could not save the task list' }
);

export const UPDATE_TEMPLATE_SUCCESS = i18n.translate(
  'xpack.cases.investigations.hooks.updateTemplateSuccess',
  { defaultMessage: 'Task list saved.' }
);

export const ADD_COMMENT_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.addCommentError',
  {
    defaultMessage: 'Could not add the comment',
  }
);

export const UPDATE_COMMENT_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.updateCommentError',
  { defaultMessage: 'Could not edit the comment' }
);

export const DELETE_COMMENT_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.deleteCommentError',
  { defaultMessage: 'Could not delete the comment' }
);

export const LINK_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.linkRecordError',
  {
    defaultMessage: 'Could not link the investigations',
  }
);

export const LINK_RECORD_SUCCESS = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.hooks.linkRecordSuccess', {
    defaultMessage: 'Linked to {displayId}.',
    values: { displayId },
  });

export const UNLINK_RECORD_ERROR = i18n.translate(
  'xpack.cases.investigations.hooks.unlinkRecordError',
  { defaultMessage: 'Could not unlink the investigations' }
);

export const UNLINK_RECORD_SUCCESS = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.hooks.unlinkRecordSuccess', {
    defaultMessage: 'Unlinked from {displayId}.',
    values: { displayId },
  });
