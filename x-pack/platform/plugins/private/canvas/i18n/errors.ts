/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ErrorStrings = {
  actionsElements: {
    getInvalidArgIndexErrorMessage: (index: string) =>
      i18n.translate('xpack.canvas.error.actionsElements.invaludArgIndexErrorMessage', {
        defaultMessage: 'Invalid argument index: {index}',
        values: {
          index,
        },
      }),
    getConvertToLensUnsupportedSavedVisualization: () =>
      i18n.translate('xpack.canvas.error.actionsElements.convertToLensUnsupportedErrrorMessage', {
        defaultMessage:
          "The legacy 'savedVisualization' Canvas function does not support Lens visualizations. Try replacing this element with an 'embeddable' Canvas function.",
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
    getDefaultIndexFetchErrorMessage: () =>
      i18n.translate('xpack.canvas.error.esService.defaultIndexFetchErrorMessage', {
        defaultMessage: "Couldn't fetch default index",
      }),
    getFieldsFetchErrorMessage: (index: string) =>
      i18n.translate('xpack.canvas.error.esService.fieldsFetchErrorMessage', {
        defaultMessage: "Couldn't fetch Elasticsearch fields for ''{index}''",
        values: {
          index,
        },
      }),
    getIndicesFetchErrorMessage: () =>
      i18n.translate('xpack.canvas.error.esService.indicesFetchErrorMessage', {
        defaultMessage: "Couldn't fetch Elasticsearch indices",
      }),
  },
  RenderWithFn: {
    getRenderErrorMessage: (functionName: string) =>
      i18n.translate('xpack.canvas.error.RenderWithFn.renderErrorMessage', {
        defaultMessage: "Rendering ''{functionName}'' failed",
        values: {
          functionName: functionName || 'function',
        },
      }),
  },
  WorkpadDropzone: {
    getTooManyFilesErrorMessage: () =>
      i18n.translate('xpack.canvas.error.workpadDropzone.tooManyFilesErrorMessage', {
        defaultMessage: 'One one file can be uploaded at a time',
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
};
