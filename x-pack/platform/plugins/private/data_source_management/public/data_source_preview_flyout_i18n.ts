/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the data source preview flyout. */
export const dataSourcePreviewFlyoutStrings = {
  emptySets: () =>
    i18n.translate('dataSourceManagement.previewFlyout.emptySets', {
      defaultMessage: 'No data sets reference this source.',
    }),

  noDescription: () =>
    i18n.translate('dataSourceManagement.previewFlyout.noDescription', {
      defaultMessage: 'None',
    }),

  closeButton: () =>
    i18n.translate('dataSourceManagement.previewFlyout.closeButton', {
      defaultMessage: 'Close',
    }),

  addDataSetButton: () =>
    i18n.translate('dataSourceManagement.previewFlyout.addDataSetButton', {
      defaultMessage: 'Add data set',
    }),

  setsTableCaption: () =>
    i18n.translate('dataSourceManagement.previewFlyout.setsTableCaption', {
      defaultMessage: 'Data sets for this source',
    }),

  setsSearchPlaceholder: () =>
    i18n.translate('dataSourceManagement.previewFlyout.setsSearchPlaceholder', {
      defaultMessage: 'Search data sets…',
    }),

  deleteDataSetDescription: () =>
    i18n.translate('dataSourceManagement.previewFlyout.deleteDataSetDescription', {
      defaultMessage: 'Delete this data set',
    }),
};

/** Preview page header / manage menu (full-page source detail). */
export const dataSourcePreviewPageStrings = {
  manageButton: () =>
    i18n.translate('dataSourceManagement.previewPage.manageButton', {
      defaultMessage: 'Manage',
    }),

  editSourceMenuItem: () =>
    i18n.translate('dataSourceManagement.previewPage.editSourceMenuItem', {
      defaultMessage: 'Edit source',
    }),

  deleteSourceMenuItem: () =>
    i18n.translate('dataSourceManagement.previewPage.deleteSourceMenuItem', {
      defaultMessage: 'Delete source',
    }),

  deleteSourceConfirmTitle: () =>
    i18n.translate('dataSourceManagement.previewPage.deleteSourceConfirmTitle', {
      defaultMessage: 'Delete this data source?',
    }),

  deleteSourceConfirmMessage: (sourceName: string) =>
    i18n.translate('dataSourceManagement.previewPage.deleteSourceConfirmMessage', {
      defaultMessage:
        'You cannot undo this. Associated data sets in this prototype are removed with the source. Delete “{sourceName}”?',
      values: { sourceName },
    }),

  deleteSourceConfirmButton: () =>
    i18n.translate('dataSourceManagement.previewPage.deleteSourceConfirmButton', {
      defaultMessage: 'Delete data source',
    }),

  cancelButton: () =>
    i18n.translate('dataSourceManagement.previewPage.cancelButton', {
      defaultMessage: 'Cancel',
    }),
};
