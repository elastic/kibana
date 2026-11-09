/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ONE_FILE_PER_MESSAGE = i18n.translate(
  'xpack.cases.markdownEditor.fileTray.oneFilePerMessage',
  {
    defaultMessage: 'You can attach 1 file per comment. Remove the current file to add another.',
  }
);

export const UPLOADING = i18n.translate('xpack.cases.markdownEditor.fileTray.uploading', {
  defaultMessage: 'Uploading…',
});

export const UPLOAD_FAILED = i18n.translate('xpack.cases.markdownEditor.fileTray.uploadFailed', {
  defaultMessage: 'Upload failed',
});

export const DROP_FILE_HERE = i18n.translate('xpack.cases.markdownEditor.fileTray.dropFileHere', {
  defaultMessage: 'Drop a file to attach it',
});

export const getRemoveFileLabel = (fileName: string) =>
  i18n.translate('xpack.cases.markdownEditor.fileTray.removeFile', {
    defaultMessage: 'Remove {fileName}',
    values: { fileName },
  });
