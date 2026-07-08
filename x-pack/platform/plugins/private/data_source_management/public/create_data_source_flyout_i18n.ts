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
    i18n.translate('dataSourceManagement.createFlyout.connectExternalTitle', {
      defaultMessage: 'Connect external data source',
    }),

  createDescription: () =>
    i18n.translate('dataSourceManagement.createFlyout.createDescription', {
      defaultMessage:
        'Define where your external data is stored and how Elasticsearch connects to it.',
    }),

  nameRequired: () =>
    i18n.translate('dataSourceManagement.createFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('dataSourceManagement.createFlyout.nameAlreadyExists', {
      defaultMessage: 'A data source with this name already exists.',
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

  cancelButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.saveButton', {
      defaultMessage: 'Save',
    }),

  connectButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.connectButton', {
      defaultMessage: 'Connect',
    }),

  connectionSettingsShow: () =>
    i18n.translate('dataSourceManagement.createFlyout.connectionSettingsShow', {
      defaultMessage: 'Show connection settings',
    }),

  connectionSettingsHide: () =>
    i18n.translate('dataSourceManagement.createFlyout.connectionSettingsHide', {
      defaultMessage: 'Hide connection settings',
    }),

  regionLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.regionLabel', {
      defaultMessage: 'Region',
    }),

  endpointLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.endpointLabel', {
      defaultMessage: 'Endpoint',
    }),

  projectIdLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.projectIdLabel', {
      defaultMessage: 'Project ID',
    }),

  tokenUriLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.tokenUriLabel', {
      defaultMessage: 'Token URI',
    }),

  accountLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.accountLabel', {
      defaultMessage: 'Account',
    }),

  keyLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.keyLabel', {
      defaultMessage: 'Key',
    }),

  authMethodLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.authMethodLabel', {
      defaultMessage: 'Preferred method',
    }),

  credentialsLabel: () =>
    i18n.translate('dataSourceManagement.createFlyout.credentialsLabel', {
      defaultMessage: 'Credentials',
    }),

  /** Full-page connect flow uses Cancel; flyout keeps Close. */
  pageCancelButton: () =>
    i18n.translate('dataSourceManagement.createFlyout.pageCancelButton', {
      defaultMessage: 'Cancel',
    }),
};
