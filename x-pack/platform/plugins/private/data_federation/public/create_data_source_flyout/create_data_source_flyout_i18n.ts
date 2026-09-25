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
    i18n.translate('xpack.dataFederation.createFlyout.title', {
      defaultMessage: 'Connect external data source',
    }),

  createDescription: () =>
    i18n.translate('xpack.dataFederation.createFlyout.createDescription', {
      defaultMessage:
        'Define where your external data is stored and how Elasticsearch connects to it.',
    }),

  editTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.editTitle', {
      defaultMessage: 'Edit data source',
    }),

  nameRequired: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameAlreadyExists', {
      defaultMessage: 'A data source with this name already exists.',
    }),

  typeLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.typeLabel', {
      defaultMessage: 'Data source type',
    }),

  typeAriaLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.typeAriaLabel', {
      defaultMessage: 'Data source type',
    }),

  nameLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  descriptionLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  cancelButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  connectButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.connectButton', {
      defaultMessage: 'Connect',
    }),

  saveButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.saveButton', {
      defaultMessage: 'Save',
    }),

  learnMore: () =>
    i18n.translate('xpack.dataFederation.createFlyout.learnMore', {
      defaultMessage: 'Learn more',
    }),

  connectErrorTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.connectErrorTitle', {
      defaultMessage: 'Could not connect the data source',
    }),

  saveErrorTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.saveErrorTitle', {
      defaultMessage: 'Could not save the data source',
    }),

  testConnectionButton: i18n.translate('xpack.dataFederation.createFlyout.testConnectionButton', {
    defaultMessage: 'Test connection',
  }),

  testConnectionSuccessTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionSuccessTitle',
    {
      defaultMessage: 'Connection successful',
    }
  ),

  testConnectionSuccessMessage: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionSuccessMessage',
    {
      defaultMessage: 'Elasticsearch can reach this data source with the current settings.',
    }
  ),

  testConnectionFailureTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionFailureTitle',
    {
      defaultMessage: 'Connection failed',
    }
  ),

  testConnectionFailureMessage: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionFailureMessage',
    {
      defaultMessage:
        'Elasticsearch could not connect to this data source. Check your settings and try again.',
    }
  ),

  testConnectionErrorTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionErrorTitle',
    {
      defaultMessage: 'Could not run the connection test',
    }
  ),

  testConnectionUntestableTitle: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionUntestableTitle',
    {
      defaultMessage: 'Connection could not be verified',
    }
  ),

  testConnectionUntestableMessage: i18n.translate(
    'xpack.dataFederation.createFlyout.testConnectionUntestableMessage',
    {
      defaultMessage:
        'Elasticsearch accepted these settings but cannot verify them without querying a dataset.',
    }
  ),
};
