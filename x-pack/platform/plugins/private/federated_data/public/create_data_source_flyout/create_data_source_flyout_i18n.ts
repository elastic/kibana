/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the create / edit data source flyout. */
export const createDataSourceFlyoutStrings = {
  createTitle: () =>
    i18n.translate('dataSets.createFlyout.title', {
      defaultMessage: 'Configure cloud data source',
    }),

  editTitle: () =>
    i18n.translate('dataSets.createFlyout.editTitle', {
      defaultMessage: 'Edit data source',
    }),

  nameRequired: () =>
    i18n.translate('dataSets.createFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('dataSets.createFlyout.nameAlreadyExists', {
      defaultMessage: 'A data source with this name already exists.',
    }),

  typeLabel: () =>
    i18n.translate('dataSets.createFlyout.typeLabel', {
      defaultMessage: 'Data source type',
    }),

  typeAriaLabel: () =>
    i18n.translate('dataSets.createFlyout.typeAriaLabel', {
      defaultMessage: 'Data source type',
    }),

  nameLabel: () =>
    i18n.translate('dataSets.createFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSets.createFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  cancelButton: () =>
    i18n.translate('dataSets.createFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  saveButton: () =>
    i18n.translate('dataSets.createFlyout.saveButton', {
      defaultMessage: 'Save',
    }),

  testConnectionButton: () =>
    i18n.translate('dataSets.createFlyout.testConnectionButton', {
      defaultMessage: 'Test Connection',
    }),

  testConnectionSuccess: () =>
    i18n.translate('dataSets.createFlyout.testConnectionSuccess', {
      defaultMessage: 'Connection test succeeded.',
    }),

  testConnectionFailed: (message: string) =>
    i18n.translate('dataSets.createFlyout.testConnectionFailed', {
      defaultMessage: 'Connection test failed: {message}',
      values: { message },
    }),
};
