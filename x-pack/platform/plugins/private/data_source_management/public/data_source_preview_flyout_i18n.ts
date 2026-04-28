/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the data source preview flyout. */
export const dataSourcePreviewFlyoutStrings = {
  setupHeading: () =>
    i18n.translate('dataSourceManagement.previewFlyout.setupHeading', {
      defaultMessage: 'Configuration',
    }),

  setsHeading: () =>
    i18n.translate('dataSourceManagement.previewFlyout.setsHeading', {
      defaultMessage: 'Data sets',
    }),

  emptySets: () =>
    i18n.translate('dataSourceManagement.previewFlyout.emptySets', {
      defaultMessage: 'No data sets reference this source.',
    }),

  closeButton: () =>
    i18n.translate('dataSourceManagement.previewFlyout.closeButton', {
      defaultMessage: 'Close',
    }),

  setsTableCaption: () =>
    i18n.translate('dataSourceManagement.previewFlyout.setsTableCaption', {
      defaultMessage: 'Data sets for this source',
    }),
};
