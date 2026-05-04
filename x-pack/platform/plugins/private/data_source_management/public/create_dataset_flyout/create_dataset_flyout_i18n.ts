/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the create data set flyout. */
export const createDatasetFlyoutStrings = {
  title: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.title', {
      defaultMessage: 'Add data set',
    }),

  nameRequired: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  dataSourceRequired: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.dataSourceRequired', {
      defaultMessage: 'Data source is required.',
    }),

  resourceRequired: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),

  nameLabel: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  dataSourceLabel: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.dataSourceLabel', {
      defaultMessage: 'Data source',
    }),

  dataSourcePlaceholder: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.dataSourcePlaceholder', {
      defaultMessage: 'Select a data source',
    }),

  dataSourceEmptyHelp: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.dataSourceEmptyHelp', {
      defaultMessage: 'Create a data source on the Sources tab before adding a data set.',
    }),

  resourceLabel: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourceHelp: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource.',
    }),

  cancelButton: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.createDatasetFlyout.saveButton', {
      defaultMessage: 'Save',
    }),
};
