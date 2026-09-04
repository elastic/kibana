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

  detailsTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.detailsTitle', {
      defaultMessage: 'Define data source',
    }),

  typeAriaLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.typeAriaLabel', {
      defaultMessage: 'Data source type',
    }),

  nameLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  /** Reflects the name rules Elasticsearch applies to the data source id (see validateIndexNameRules). */
  nameHelp: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameHelp', {
      defaultMessage:
        'Unique name for use in datasets. All lowercase, dash, underscore, and numbers are supported.',
    }),

  nameReadOnlyHelp: () =>
    i18n.translate('xpack.dataFederation.createFlyout.nameReadOnlyHelp', {
      defaultMessage: 'The name of an existing data source cannot be changed.',
    }),

  descriptionLabel: () =>
    i18n.translate('xpack.dataFederation.createFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  descriptionHelp: () =>
    i18n.translate('xpack.dataFederation.createFlyout.descriptionHelp', {
      defaultMessage: 'A brief description to identify this data source.',
    }),

  cancelButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  connectAndTestButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.connectAndTestButton', {
      defaultMessage: 'Connect and test',
    }),

  saveAndTestButton: () =>
    i18n.translate('xpack.dataFederation.createFlyout.saveAndTestButton', {
      defaultMessage: 'Save and test',
    }),

  testConnectionSuccessTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.testConnectionSuccessTitle', {
      defaultMessage: 'Connection successful',
    }),

  testConnectionSuccessMessage: () =>
    i18n.translate('xpack.dataFederation.createFlyout.testConnectionSuccessMessage', {
      defaultMessage: 'Elasticsearch can reach this data source with the current settings.',
    }),

  testConnectionErrorTitle: () =>
    i18n.translate('xpack.dataFederation.createFlyout.testConnectionErrorTitle', {
      defaultMessage: 'Connection failed',
    }),

  optionalFieldLabel: (label: string) =>
    i18n.translate('xpack.dataFederation.createFlyout.fieldLabelOptional', {
      defaultMessage: '{label} (Optional)',
      values: { label },
    }),

  fieldLabel: (label: string, isOptional: boolean) =>
    isOptional ? createDataSourceFlyoutStrings.optionalFieldLabel(label) : label,
};
