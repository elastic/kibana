/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the create data source flyout. */
export const createDataSourceFlyoutStrings = {
  title: () =>
    i18n.translate('dataSourceManagement.createFlyout.title', {
      defaultMessage: 'Add data source',
    }),

  nameRequired: () =>
    i18n.translate('dataSourceManagement.createFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  typeLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.typeLabel', {
      defaultMessage: 'Type',
    }),

  typeAriaLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.typeAriaLabel', {
      defaultMessage: 'Data source type',
    }),

  nameLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  closeButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.closeButton', {
      defaultMessage: 'Close',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.saveButton', {
      defaultMessage: 'Save',
    }),
};
