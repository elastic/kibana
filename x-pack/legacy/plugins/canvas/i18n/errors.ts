/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS, JSON } from './constants';

export const ErrorStrings = {
  WorkpadLoader: {
    getCloneFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadLoader.cloneFailureErrorMessage', {
        defaultMessage: `Couldn't clone workpad`,
      }),
    getDeleteFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadLoader.deleteFailureErrorMessage', {
        defaultMessage: `Couldn't delete all workpads`,
      }),
    getFindFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadLoader.findFailureErrorMessage', {
        defaultMessage: `Couldn't find workpad`,
      }),
    getUploadFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadLoader.uploadFailureErrorMessage', {
        defaultMessage: `Couldn't upload workpad`,
      }),
  },
  WorkpadFileUpload: {
    getFileUploadFailureWithFileNameErrorMessage: (fileName: string) =>
      i18n.translate('xpack.canvas.errors.workpadUpload.fileUploadFileWithFileNameErrorMessage', {
        defaultMessage: `Couldn't upload '{fileName}'`,
        values: {
          fileName,
        },
      }),
    getFileUploadFailureWithoutFileNameErrorMessage: () =>
      i18n.translate(
        'xpack.canvas.error.workpadUpload.fileUploadFailureWithoutFileNameErrorMessage',
        {
          defaultMessage: `Couldn't upload file`,
        }
      ),
    getAcceptJSONOnlyErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadUpload.acceptJSONOnlyErrorMessage', {
        defaultMessage: 'Only {JSON} files are accepted',
        values: {
          JSON,
        },
      }),
    getMissingPropertiesErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadUpload.missingPropertiesErrorMessage', {
        defaultMessage:
          'Some properties required for a {CANVAS} workpad are missing.  Edit your {JSON} file to provide the correct property values, and try again.',
        values: {
          CANVAS,
          JSON,
        },
      }),
  },
};
