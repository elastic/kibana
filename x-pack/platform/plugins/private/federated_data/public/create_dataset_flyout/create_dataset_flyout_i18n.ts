/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the create / edit data set flyout. */
export const createDatasetFlyoutStrings = {
  createTitle: () =>
    i18n.translate('dataSets.createDatasetFlyout.createTitle', {
      defaultMessage: 'Add data set',
    }),

  editTitle: () =>
    i18n.translate('dataSets.createDatasetFlyout.editTitle', {
      defaultMessage: 'Edit data set',
    }),

  editTitleWithId: (id: string) =>
    i18n.translate('dataSets.createDatasetFlyout.editTitleWithId', {
      defaultMessage: 'Edit data set: {id}',
      values: { id },
    }),

  nameRequired: () =>
    i18n.translate('dataSets.createDatasetFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('dataSets.createDatasetFlyout.nameAlreadyExists', {
      defaultMessage: 'A data set with this name already exists.',
    }),

  dataSourceRequired: () =>
    i18n.translate('dataSets.createDatasetFlyout.dataSourceRequired', {
      defaultMessage: 'Data source is required.',
    }),

  resourceRequired: () =>
    i18n.translate('dataSets.createDatasetFlyout.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),

  nameLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.nameLabel', {
      defaultMessage: 'Dataset ID',
    }),

  nameHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.nameHelp', {
      defaultMessage: 'Unique name for use in queries',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  dataSourceLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.dataSourceLabel', {
      defaultMessage: 'Data source',
    }),

  dataSourcePlaceholder: () =>
    i18n.translate('dataSets.createDatasetFlyout.dataSourcePlaceholder', {
      defaultMessage: 'Select a data source',
    }),

  dataSourceEmptyHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.dataSourceEmptyHelp', {
      defaultMessage: 'Create a data source on the Sources tab before adding a data set.',
    }),

  dataSourceHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.dataSourceHelp', {
      defaultMessage: 'Select the external connection this data set belongs to.',
    }),

  resourceLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourceHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource.',
    }),

  settingsSectionHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsSectionHelp', {
      defaultMessage: 'Optional format and parsing settings for this data set.',
    }),

  optionalSettingsShow: () =>
    i18n.translate('dataSets.createDatasetFlyout.optionalSettingsShow', {
      defaultMessage: 'Show optional settings',
    }),

  optionalSettingsHide: () =>
    i18n.translate('dataSets.createDatasetFlyout.optionalSettingsHide', {
      defaultMessage: 'Hide optional settings',
    }),

  settingsFormatLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatLabel', {
      defaultMessage: 'Format',
    }),

  settingsFormatAutomatic: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatAutomatic', {
      defaultMessage: 'Automatic',
    }),

  settingsFormatParquet: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatParquet', {
      defaultMessage: 'Parquet',
    }),

  settingsFormatCsv: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatCsv', {
      defaultMessage: 'CSV',
    }),

  settingsFormatNdjson: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatNdjson', {
      defaultMessage: 'NDJSON',
    }),

  settingsFormatOrc: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsFormatOrc', {
      defaultMessage: 'ORC',
    }),

  settingsErrorModeLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsErrorModeLabel', {
      defaultMessage: 'Error mode',
    }),

  settingsErrorModePlaceholder: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsErrorModePlaceholder', {
      defaultMessage: 'Default',
    }),

  settingsErrorModeFailFast: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsErrorModeFailFast', {
      defaultMessage: 'Fail fast',
    }),

  settingsErrorModeSkipRow: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsErrorModeSkipRow', {
      defaultMessage: 'Skip row',
    }),

  settingsErrorModeNullField: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsErrorModeNullField', {
      defaultMessage: 'Null field',
    }),

  settingsMaxErrorsLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorsLabel', {
      defaultMessage: 'Max errors',
    }),

  settingsMaxErrorsHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorsHelp', {
      defaultMessage: 'Maximum number of row errors before failing.',
    }),

  settingsMaxErrorRatioLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorRatioLabel', {
      defaultMessage: 'Max error ratio',
    }),

  settingsMaxErrorRatioHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorRatioHelp', {
      defaultMessage: 'Maximum ratio of row errors before failing (0 to 1).',
    }),

  settingsMaxErrorsInvalid: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorsInvalid', {
      defaultMessage: 'Must be a non-negative integer.',
    }),

  settingsMaxErrorRatioInvalid: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsMaxErrorRatioInvalid', {
      defaultMessage: 'Must be a number between 0 and 1.',
    }),

  settingsPartitionDetectionLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionLabel', {
      defaultMessage: 'Partition detection',
    }),

  settingsPartitionDetectionPlaceholder: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionPlaceholder', {
      defaultMessage: 'Default',
    }),

  settingsPartitionDetectionAuto: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionAuto', {
      defaultMessage: 'Auto',
    }),

  settingsPartitionDetectionHive: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionHive', {
      defaultMessage: 'Hive',
    }),

  settingsPartitionDetectionTemplate: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionTemplate', {
      defaultMessage: 'Template',
    }),

  settingsPartitionDetectionNone: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionDetectionNone', {
      defaultMessage: 'None',
    }),

  settingsPartitionPathLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionPathLabel', {
      defaultMessage: 'Partition path',
    }),

  settingsPartitionPathHelp: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsPartitionPathHelp', {
      defaultMessage: 'Path pattern used for partition detection.',
    }),

  settingsHivePartitioningLabel: () =>
    i18n.translate('dataSets.createDatasetFlyout.settingsHivePartitioningLabel', {
      defaultMessage: 'Hive partitioning',
    }),

  cancelButton: () =>
    i18n.translate('dataSets.createDatasetFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  saveButton: () =>
    i18n.translate('dataSets.createDatasetFlyout.saveButton', {
      defaultMessage: 'Save',
    }),
};
