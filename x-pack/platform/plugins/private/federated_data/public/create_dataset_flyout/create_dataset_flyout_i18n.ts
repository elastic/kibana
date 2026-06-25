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
    i18n.translate('xpack.dataFederation.createDatasetFlyout.createTitle', {
      defaultMessage: 'Add data set',
    }),

  editTitle: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.editTitle', {
      defaultMessage: 'Edit data set',
    }),

  editTitleWithId: (id: string) =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.editTitleWithId', {
      defaultMessage: 'Edit data set: {id}',
      values: { id },
    }),

  nameRequired: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.nameAlreadyExists', {
      defaultMessage: 'A data set with this name already exists.',
    }),

  dataSourceRequired: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.dataSourceRequired', {
      defaultMessage: 'Data source is required.',
    }),

  resourceRequired: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),

  nameLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  nameHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.nameHelp', {
      defaultMessage: 'Unique name for use in queries',
    }),

  descriptionLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  dataSourceLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.dataSourceLabel', {
      defaultMessage: 'Data source',
    }),

  dataSourcePlaceholder: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.dataSourcePlaceholder', {
      defaultMessage: 'Select a data source',
    }),

  dataSourceEmptyHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.dataSourceEmptyHelp', {
      defaultMessage: 'Create a data source on the Sources tab before adding a data set.',
    }),

  dataSourceHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.dataSourceHelp', {
      defaultMessage: 'Select the external connection this data set belongs to.',
    }),

  resourceLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourceHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource.',
    }),

  settingsSectionHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsSectionHelp', {
      defaultMessage: 'Optional format and parsing settings for this data set.',
    }),

  optionalSettingsShow: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.optionalSettingsShow', {
      defaultMessage: 'Show optional settings',
    }),

  optionalSettingsHide: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.optionalSettingsHide', {
      defaultMessage: 'Hide optional settings',
    }),

  settingsFormatLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatLabel', {
      defaultMessage: 'Format',
    }),

  settingsFormatAutomatic: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatAutomatic', {
      defaultMessage: 'Automatic',
    }),

  settingsFormatParquet: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatParquet', {
      defaultMessage: 'Parquet',
    }),

  settingsFormatCsv: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatCsv', {
      defaultMessage: 'CSV',
    }),

  settingsFormatNdjson: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatNdjson', {
      defaultMessage: 'NDJSON',
    }),

  settingsFormatOrc: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsFormatOrc', {
      defaultMessage: 'ORC',
    }),

  settingsErrorModeLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsErrorModeLabel', {
      defaultMessage: 'Error mode',
    }),

  settingsErrorModePlaceholder: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsErrorModePlaceholder', {
      defaultMessage: 'Default',
    }),

  settingsErrorModeFailFast: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsErrorModeFailFast', {
      defaultMessage: 'Fail fast',
    }),

  settingsErrorModeSkipRow: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsErrorModeSkipRow', {
      defaultMessage: 'Skip row',
    }),

  settingsErrorModeNullField: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsErrorModeNullField', {
      defaultMessage: 'Null field',
    }),

  settingsMaxErrorsLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorsLabel', {
      defaultMessage: 'Max errors',
    }),

  settingsMaxErrorsHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorsHelp', {
      defaultMessage: 'Maximum number of row errors before failing.',
    }),

  settingsMaxErrorRatioLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorRatioLabel', {
      defaultMessage: 'Max error ratio',
    }),

  settingsMaxErrorRatioHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorRatioHelp', {
      defaultMessage: 'Maximum ratio of row errors before failing (0 to 1).',
    }),

  settingsMaxErrorsInvalid: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorsInvalid', {
      defaultMessage: 'Must be a non-negative integer.',
    }),

  settingsMaxErrorRatioInvalid: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsMaxErrorRatioInvalid', {
      defaultMessage: 'Must be a number between 0 and 1.',
    }),

  settingsSchemaSampleSizeLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsSchemaSampleSizeLabel', {
      defaultMessage: 'Schema sample size',
    }),

  settingsSchemaSampleSizeHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsSchemaSampleSizeHelp', {
      defaultMessage: 'Number of rows to sample when inferring schema.',
    }),

  settingsSchemaSampleSizeInvalid: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsSchemaSampleSizeInvalid', {
      defaultMessage: 'Must be a positive integer.',
    }),

  settingsPartitionDetectionLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionLabel', {
      defaultMessage: 'Partition detection',
    }),

  settingsPartitionDetectionPlaceholder: () =>
    i18n.translate(
      'xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionPlaceholder',
      {
        defaultMessage: 'Default',
      }
    ),

  settingsPartitionDetectionAuto: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionAuto', {
      defaultMessage: 'Auto',
    }),

  settingsPartitionDetectionHive: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionHive', {
      defaultMessage: 'Hive',
    }),

  settingsPartitionDetectionTemplate: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionTemplate', {
      defaultMessage: 'Template',
    }),

  settingsPartitionDetectionNone: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionDetectionNone', {
      defaultMessage: 'None',
    }),

  settingsPartitionPathLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionPathLabel', {
      defaultMessage: 'Partition path',
    }),

  settingsPartitionPathHelp: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsPartitionPathHelp', {
      defaultMessage: 'Path pattern used for partition detection.',
    }),

  settingsHivePartitioningLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.settingsHivePartitioningLabel', {
      defaultMessage: 'Hive partitioning',
    }),

  cancelButton: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  saveButton: () =>
    i18n.translate('xpack.dataFederation.createDatasetFlyout.saveButton', {
      defaultMessage: 'Save',
    }),
};
