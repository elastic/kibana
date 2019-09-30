/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS, JSON } from './constants';

export const ErrorStrings = {
  actionsElements: {
    getInvalidArgIndexErrorMessage: (index: string) =>
      i18n.translate('xpack.canvas.error.actionsElements.invaludArgIndexErrorMessage', {
        defaultMessage: 'Invalid argument index: {index}',
        values: {
          index,
        },
      }),
  },
  downloadWorkpad: {
    getDownloadFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.downloadWorkpad.downloadFailureErrorMessage', {
        defaultMessage: "Couldn't download workpad",
      }),
  },
  esPersist: {
    getSaveFailureTitle: () =>
      i18n.translate('xpack.canvas.error.esPersist.saveFailureTitle', {
        defaultMessage: "Couldn't save your changes to Elasticsearch",
      }),
    getTooLargeErrorMessage: () =>
      i18n.translate('xpack.canvas.error.esPersist.tooLargeErrorMessage', {
        defaultMessage:
          'The server gave a response that the workpad data was too large. This usually means uploaded image assets that are too large for Kibana or a proxy. Try removing some assets in the asset manager.',
      }),
    getUpdateFailureTitle: () =>
      i18n.translate('xpack.canvas.error.esPersist.updateFailureTitle', {
        defaultMessage: "Couldn't update workpad",
      }),
  },
  esService: {
    getFieldsFetchErrorMessage: (index: string) =>
      i18n.translate('xpack.canvas.error.esService.fieldsFetchErrorMessage', {
        defaultMessage: "Couldn't fetch Elasticsearch fields for '{index}'",
        values: {
          index,
        },
      }),
    getIndicesFetchErrorMessage: () =>
      i18n.translate('xpack.canvas.error.esService.indicesFetchErrorMessage', {
        defaultMessage: "Couldn't fetch Elasticsearch indices",
      }),
    getDefaultIndexFetchErrorMessage: () =>
      i18n.translate('xpack.canvas.error.esService.defaultIndexFetchErrorMessage', {
        defaultMessage: "Couldn't fetch default index",
      }),
  },
  runInterpreter: {
    getRenderErrorMessage: (type: string) =>
      i18n.translate('xpack.canvas.error.runInterpreter.renderErrorMessage', {
        defaultMessage: "Ack! I don't know how to render a '{type}'",
        values: {
          type,
        },
      }),
  },
  workpadRoutes: {
    getCreateFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadRoutes.createFailureErrorMessage', {
        defaultMessage: "Couldn't create workpad",
      }),
    getLoadFailureErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadRoutes.loadFailureErrorMessage', {
        defaultMessage: "Couldn't load workpad with ID",
      }),
  },
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
