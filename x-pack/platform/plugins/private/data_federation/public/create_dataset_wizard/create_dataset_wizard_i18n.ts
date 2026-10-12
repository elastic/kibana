/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for dataset create/edit wizard. */
export const createDatasetWizardStrings = {
  pageTitle: i18n.translate('xpack.dataFederation.createDatasetWizard.pageTitle', {
    defaultMessage: 'Add dataset',
  }),
  backToListLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.backToListLabel', {
    defaultMessage: 'Datasets',
  }),
  editPageTitle: (id: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.editPageTitle', {
      defaultMessage: 'Edit dataset: {id}',
      values: { id },
    }),
  datasetStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.datasetStepLabel', {
    defaultMessage: 'Define dataset',
  }),
  datasetStepSubheader: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.datasetStepSubheader',
    {
      defaultMessage: 'Select the specific data you want to query within a connected data source.',
    }
  ),
  additionalStepLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.advancedStepLabel',
    {
      defaultMessage: 'Optional settings',
    }
  ),
  reviewNoAdditionalSettings: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.reviewNoAdditionalSettings',
    {
      defaultMessage: 'No additional settings configured.',
    }
  ),
  additionalStepSubheader: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalStepSubheader',
    {
      defaultMessage:
        'Customize how your files are read. Unchanged settings use the defaults for that file format.',
    }
  ),
  mappingStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.mappingStepLabel', {
    defaultMessage: 'Schema mappings',
  }),
  mappingStepErrorsTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.mappingStepErrorsTitle',
    {
      defaultMessage: 'Fix the following errors',
    }
  ),
  defineSchemaRequiresFieldError: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.defineSchemaRequiresField',
    {
      defaultMessage: 'When Use mapped fields only is selected, you must map at least one field.',
    }
  ),
  configureSchemaResolutionOptional: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.configureSchemaResolutionOptional',
    {
      defaultMessage: 'Configure schema resolution (optional)',
    }
  ),
  commonSettingsSectionTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.commonSettingsSectionTitle',
    {
      defaultMessage: 'Commonly adjusted settings',
    }
  ),

  commonSettingsReference: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.commonSettingsReference',
    {
      defaultMessage: 'Common settings',
    }
  ),
  advancedSettingsSectionTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.advancedSettingsSectionTitle',
    {
      defaultMessage: 'Advanced settings',
    }
  ),
  trueLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.trueLabel', {
    defaultMessage: 'True',
  }),
  falseLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.falseLabel', {
    defaultMessage: 'False',
  }),
  enabledLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.enabledLabel', {
    defaultMessage: 'Enabled',
  }),
  disabledLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.disabledLabel', {
    defaultMessage: 'Disabled',
  }),
  reviewStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.reviewStepLabel', {
    defaultMessage: 'Review',
  }),
  notSet: i18n.translate('xpack.dataFederation.createDatasetWizard.notSetValue', {
    defaultMessage: 'Not set',
  }),
  reviewTitle: (name: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.reviewTitle', {
      defaultMessage: 'Review configuration for {name}',
      values: { name },
    }),
  reviewSummaryTabLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.reviewSummaryTabLabel',
    {
      defaultMessage: 'Summary',
    }
  ),
  reviewRequestTabLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.reviewRequestTabLabel',
    {
      defaultMessage: 'Request',
    }
  ),
  reviewRequestDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.reviewRequestDescription',
    {
      defaultMessage: 'This request will create or update the dataset.',
    }
  ),
  customBadgeLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.customBadgeLabel', {
    defaultMessage: 'Custom',
  }),
  dataSourceTypeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.dataSourceTypeLabel',
    {
      defaultMessage: 'Type',
    }
  ),
  schemaMappingModeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.schemaMappingModeLabel',
    {
      defaultMessage: 'Schema mapping mode',
    }
  ),
  inferSchemaLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.inferSchemaLabel', {
    defaultMessage: 'Infer unmapped fields',
  }),
  defineSchemaLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.defineSchemaLabel', {
    defaultMessage: 'Use mapped fields only',
  }),
  mappedFieldsLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.mappedFieldsLabel', {
    defaultMessage: 'Mapped fields',
  }),
  mappedFieldsCount: (count: number) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.mappedFieldsCount', {
      defaultMessage: '{count, plural, one {# field} other {# fields}}',
      values: { count },
    }),
  timeseriesDataLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timeseriesToggleLabel',
    {
      defaultMessage: 'Enable time-based filtering',
    }
  ),
  timestampFieldLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timestampFieldLabel',
    {
      defaultMessage: 'Timestamp field',
    }
  ),
  timestampFormatLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timestampFormatLabel',
    {
      defaultMessage: 'Timestamp format',
    }
  ),
  timestampTypeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timestampTypeLabel',
    {
      defaultMessage: 'Timestamp field type',
    }
  ),
  onLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.onLabel', {
    defaultMessage: 'On',
  }),
  offLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.offLabel', {
    defaultMessage: 'Off',
  }),
  addDatasetButton: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.addDatasetButtonLabel',
    {
      defaultMessage: 'Add dataset',
    }
  ),
  saveErrorTitle: i18n.translate('xpack.dataFederation.createDatasetWizard.saveErrorTitle', {
    defaultMessage: 'Could not save the dataset',
  }),
  deletePreviousErrorTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.deletePreviousErrorTitle',
    {
      defaultMessage: 'Could not delete the previous dataset',
    }
  ),
  dataSourceRefreshAfterSaveError: (savedName: string, reason: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.dataSourceRefreshAfterSaveError', {
      defaultMessage:
        'Data source "{savedName}" was saved, but the data sources list could not be refreshed: {reason}',
      values: { savedName, reason },
    }),
  refreshAfterSaveErrorTitle: (savedName: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.refreshAfterSaveErrorTitle', {
      defaultMessage:
        'Dataset "{savedName}" was saved, but the datasets list could not be refreshed',
      values: { savedName },
    }),
  deletePreviousErrorText: (savedName: string, previousName: string, reason: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.deletePreviousErrorText', {
      defaultMessage:
        'The dataset was saved as "{savedName}", but the previous dataset "{previousName}" could not be deleted: {reason}',
      values: { savedName, previousName, reason },
    }),
  backButton: i18n.translate('xpack.dataFederation.createDatasetWizard.backButtonLabel', {
    defaultMessage: 'Back',
  }),
  nextButton: i18n.translate('xpack.dataFederation.createDatasetWizard.nextButtonLabel', {
    defaultMessage: 'Next',
  }),
  savingButton: i18n.translate('xpack.dataFederation.createDatasetWizard.savingButtonLabel', {
    defaultMessage: 'Saving...',
  }),

  // Form strings
  nameRequired: i18n.translate('xpack.dataFederation.createDatasetForm.nameRequired', {
    defaultMessage: 'Name is required.',
  }),

  nameAlreadyExists: i18n.translate('xpack.dataFederation.createDatasetForm.nameAlreadyExists', {
    defaultMessage: 'A dataset with this name already exists.',
  }),

  dataSourceRequired: i18n.translate('xpack.dataFederation.createDatasetForm.dataSourceRequired', {
    defaultMessage: 'Data source is required.',
  }),

  resourceRequired: i18n.translate('xpack.dataFederation.createDatasetForm.resourceRequired', {
    defaultMessage: 'Resource is required.',
  }),

  resourceInvalid: i18n.translate('xpack.dataFederation.createDatasetForm.resourceInvalid', {
    defaultMessage: 'Resource must be a valid URI.',
  }),

  nameLabel: i18n.translate('xpack.dataFederation.createDatasetForm.nameLabel', {
    defaultMessage: 'Dataset name',
  }),

  nameHelp: i18n.translate('xpack.dataFederation.createDatasetForm.nameHelp', {
    defaultMessage:
      'Unique name for use in queries. All lowercase, dash, underscore, and numbers are supported',
  }),

  namePlaceholder: i18n.translate('xpack.dataFederation.createDatasetForm.namePlaceholder', {
    defaultMessage: 'e.g. my-dataset',
  }),

  descriptionLabel: i18n.translate('xpack.dataFederation.createDatasetForm.descriptionLabel', {
    defaultMessage: 'Description (optional)',
  }),

  descriptionHelp: i18n.translate('xpack.dataFederation.createDatasetForm.descriptionHelp', {
    defaultMessage: 'A brief description to identify this dataset',
  }),

  connectNewDataSourceDropDownOptionLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.connectNewDataSourceDropDownOptionLabel',
    {
      defaultMessage: 'Connect new data source',
    }
  ),

  dataSourceLabel: i18n.translate('xpack.dataFederation.createDatasetForm.dataSourceLabel', {
    defaultMessage: 'Data source',
  }),

  dataSourcePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.dataSourcePlaceholder',
    {
      defaultMessage: 'Select an existing data source or connect a new one',
    }
  ),

  resourceLabel: i18n.translate('xpack.dataFederation.createDatasetForm.resourceLabel', {
    defaultMessage: 'Resource',
  }),

  settingsFormatRequired: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatRequired',
    {
      defaultMessage: 'Format is required.',
    }
  ),
  timestampFieldPathRequiredSave: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timestampFieldPathRequiredSave',
    {
      defaultMessage: 'When timeseries data is enabled, Field name is required.',
    }
  ),

  settingsFormatLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatLabel',
    {
      defaultMessage: 'Format',
    }
  ),

  settingsFormatPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatPlaceholder',
    {
      defaultMessage: 'Select a format',
    }
  ),

  autoDetectedSuffix: i18n.translate('xpack.dataFederation.createDatasetForm.autoDetectedSuffix', {
    defaultMessage: '(auto-detected)',
  }),

  settingsFormatParquet: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatParquet',
    {
      defaultMessage: 'Parquet',
    }
  ),
  settingsFormatParquetDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatParquetDescription',
    {
      defaultMessage: 'Columnar storage format optimized for analytics.',
    }
  ),

  settingsFormatCsv: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatCsv', {
    defaultMessage: 'CSV',
  }),
  settingsFormatCsvDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatCsvDescription',
    {
      defaultMessage: 'Comma-separated values with a header row.',
    }
  ),

  settingsFormatNdjson: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatNdjson',
    {
      defaultMessage: 'NDJSON',
    }
  ),
  settingsFormatNdjsonDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatNdjsonDescription',
    {
      defaultMessage: 'Newline-delimited JSON objects, one per line.',
    }
  ),

  settingsFormatTsv: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatTsv', {
    defaultMessage: 'TSV',
  }),
  settingsFormatTsvDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatTsvDescription',
    {
      defaultMessage: 'Tab-separated values with a header row.',
    }
  ),

  settingsFormatOrc: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatOrc', {
    defaultMessage: 'ORC',
  }),
  settingsFormatOrcDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatOrcDescription',
    {
      defaultMessage: 'Optimized Row Columnar format for Hive workloads.',
    }
  ),

  settingsErrorModeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeLabel',
    {
      defaultMessage: 'Error mode',
    }
  ),

  settingsErrorModePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModePlaceholder',
    {
      defaultMessage: 'Select error mode',
    }
  ),

  settingsErrorModeFailFast: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeFailFast',
    {
      defaultMessage: 'Fail fast',
    }
  ),
  settingsErrorModeFailFastDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeFailFastDescription',
    {
      defaultMessage: 'Stop the query at the first error.',
    }
  ),

  settingsErrorModeSkipRow: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeSkipRow',
    {
      defaultMessage: 'Skip row',
    }
  ),
  settingsErrorModeSkipRowDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeSkipRowDescription',
    {
      defaultMessage: 'Skip rows with errors and continue the query.',
    }
  ),

  settingsErrorModeNullField: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeNullField',
    {
      defaultMessage: 'Null field',
    }
  ),
  settingsErrorModeNullFieldDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeNullFieldDescription',
    {
      defaultMessage:
        'Replace values that cause errors with null and keep the row. Rows that can’t be read are skipped.',
    }
  ),

  defaultBadgeLabel: i18n.translate('xpack.dataFederation.createDatasetForm.defaultBadgeLabel', {
    defaultMessage: 'Default',
  }),

  settingsMaxErrorsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsLabel',
    {
      defaultMessage: 'Maximum errors',
    }
  ),

  settingsMaxErrorsPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsPlaceholder',
    {
      defaultMessage: 'Enter a number of errors',
    }
  ),

  settingsMaxErrorRatioLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioLabel',
    {
      defaultMessage: 'Maximum error rate',
    }
  ),
  settingsMaxErrorRatioPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioPlaceholder',
    {
      defaultMessage: 'Enter a ratio between 0 and 1',
    }
  ),

  settingsMaxErrorsInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsInvalidNonNegative',
    {
      defaultMessage: 'Must be a whole number of 0 or more, or empty.',
    }
  ),

  settingsMaxErrorRatioInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioInvalid',
    {
      defaultMessage: 'Must be a number between 0 and 1.',
    }
  ),

  settingsFileExclusionsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFileExclusionsLabel',
    {
      defaultMessage: 'File exclusions',
    }
  ),

  settingsPartitionDetectionLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionLabel',
    {
      defaultMessage: 'Partition detection',
    }
  ),

  settingsPartitionDetectionPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionPlaceholder',
    {
      defaultMessage: 'Select partition detection',
    }
  ),

  settingsPartitionDetectionAuto: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionAuto',
    {
      defaultMessage: 'Auto',
    }
  ),

  settingsPartitionDetectionAutoDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionAutoDescription',
    {
      defaultMessage: 'Detect partitions automatically from the resource path.',
    }
  ),

  settingsPartitionDetectionHive: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionHive',
    {
      defaultMessage: 'Hive-style (key=value)',
    }
  ),

  settingsPartitionDetectionHiveDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionHiveDescription',
    {
      defaultMessage: 'Use Hive-style partition directories (key=value).',
    }
  ),

  settingsPartitionDetectionTemplate: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionTemplate',
    {
      defaultMessage: 'Template',
    }
  ),

  settingsPartitionDetectionTemplateDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionTemplateDescription',
    {
      defaultMessage: 'Read partition values from path template.',
    }
  ),

  settingsPartitionDetectionNone: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionNone',
    {
      defaultMessage: 'No partition detection',
    }
  ),

  settingsPartitionDetectionNoneDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionNoneDescription',
    {
      defaultMessage: 'Do not infer partitions from the path.',
    }
  ),

  settingsSchemaResolutionLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionLabel',
    {
      defaultMessage: 'Schema resolution',
    }
  ),

  settingsSchemaResolutionHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionHelp',
    {
      defaultMessage: 'How schemas are reconciled across files when reading a glob.',
    }
  ),

  settingsSchemaResolutionInfo: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionInfo',
    {
      defaultMessage: 'by default.',
    }
  ),

  settingsSchemaResolutionPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionPlaceholder',
    {
      defaultMessage: 'Select schema resolution',
    }
  ),

  settingsSchemaResolutionFirstFileWins: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionFirstFileWins',
    {
      defaultMessage: 'First file wins',
    }
  ),
  settingsSchemaResolutionFirstFileWinsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionFirstFileWinsDescription',
    {
      defaultMessage: 'Use the schema from the first matching file.',
    }
  ),

  settingsSchemaResolutionStrict: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionStrict',
    {
      defaultMessage: 'Strict',
    }
  ),
  settingsSchemaResolutionStrictDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionStrictDescription',
    {
      defaultMessage: 'Require an identical schema across all files.',
    }
  ),

  settingsSchemaResolutionUnionByName: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionUnionByName',
    {
      defaultMessage: 'Union by name',
    }
  ),
  settingsSchemaResolutionUnionByNameDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionUnionByNameDescription',
    {
      defaultMessage: 'Merge columns by name across files.',
    }
  ),

  settingsPartitionPathLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathLabel',
    {
      defaultMessage: 'Partition path template',
    }
  ),

  settingsPartitionPathPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathPlaceholder',
    {
      defaultMessage: 'Select or enter a partition path',
    }
  ),

  settingsPartitionPathRequired: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathRequired',
    {
      defaultMessage: 'Partition path is required.',
    }
  ),

  settingsDelimiterLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterLabel',
    {
      defaultMessage: 'Delimiter',
    }
  ),

  settingsDelimiterPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterPlaceholder',
    {
      defaultMessage: 'Select or enter a delimiter',
    }
  ),

  settingsDelimiterInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterInvalidCharacterOrSequence',
    {
      defaultMessage: 'Must be a single character, \\t, or \\\\.',
    }
  ),

  settingsDelimiterOptionComma: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterOptionComma',
    { defaultMessage: 'Comma (,)' }
  ),
  settingsDelimiterOptionTab: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterOptionTab',
    { defaultMessage: 'Tab (\\t)' }
  ),
  settingsDelimiterOptionSemicolon: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterOptionSemicolon',
    { defaultMessage: 'Semicolon (;)' }
  ),
  settingsDelimiterOptionPipe: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterOptionPipe',
    { defaultMessage: 'Pipe (|)' }
  ),

  settingsModeLabel: i18n.translate('xpack.dataFederation.createDatasetForm.settingsModeLabel', {
    defaultMessage: 'Quote mode',
  }),

  settingsModePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsModePlaceholder',
    {
      defaultMessage: 'Select quote mode',
    }
  ),

  comboBoxSelectValidOption: i18n.translate(
    'xpack.dataFederation.createDatasetForm.comboBoxSelectValidOption',
    {
      defaultMessage: 'Please select a valid option or clear your entry',
    }
  ),

  settingsModeQuoted: i18n.translate('xpack.dataFederation.createDatasetForm.settingsModeQuoted', {
    defaultMessage: 'Quoted',
  }),

  settingsModeEscaped: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsModeEscaped',
    {
      defaultMessage: 'Escaped',
    }
  ),

  settingsModePlain: i18n.translate('xpack.dataFederation.createDatasetForm.settingsModePlain', {
    defaultMessage: 'Plain',
  }),

  settingsModeQuotedDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsModeQuotedDescription',
    {
      defaultMessage: 'Fields may be wrapped in quote characters.',
    }
  ),

  settingsModeEscapedDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsModeEscapedDescription',
    {
      defaultMessage: 'Special characters are escaped within fields.',
    }
  ),

  settingsModePlainDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsModePlainDescription',
    {
      defaultMessage: 'Fields are read without quoting rules.',
    }
  ),

  settingsHeaderRowLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowLabel',
    {
      defaultMessage: 'Header row',
    }
  ),

  settingsHeaderRowDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowDescription',
    {
      defaultMessage: 'Whether the first row holds column names rather than data.',
    }
  ),

  settingsHeaderRowPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowPlaceholder',
    {
      defaultMessage: 'Select header row',
    }
  ),

  settingsHeaderRowTrueDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowTrueDescription',
    {
      defaultMessage: 'First row holds column names.',
    }
  ),

  settingsHeaderRowFalseDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowFalseDescription',
    {
      defaultMessage: 'First row has data.',
    }
  ),

  settingsHeaderRowTrue: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowTrue',
    {
      defaultMessage: 'Yes',
    }
  ),

  settingsHeaderRowFalse: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowFalse',
    {
      defaultMessage: 'No',
    }
  ),

  settingsSkipRowsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSkipRowsLabel',
    {
      defaultMessage: 'Skip rows',
    }
  ),

  settingsSkipRowsPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSkipRowsPlaceholder',
    {
      defaultMessage: 'e.g. 0',
    }
  ),

  settingsSkipRowsInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSkipRowsInvalid',
    {
      defaultMessage: 'Must be a whole number between 0 and 1000 or empty.',
    }
  ),

  settingsNullValueLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsNullValueLabel',
    {
      defaultMessage: 'Null value',
    }
  ),

  settingsNullValuePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsNullValuePlaceholder',
    {
      defaultMessage: 'Select or enter a null value',
    }
  ),

  settingsEncodingLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingLabel',
    {
      defaultMessage: 'Encoding',
    }
  ),

  settingsEncodingDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingDescription',
    {
      defaultMessage:
        'Character encoding of the file. If your encoding is not available, create a custom one.',
    }
  ),

  settingsEncodingPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingPlaceholder',
    {
      defaultMessage: 'Select or enter an encoding',
    }
  ),

  settingsEncodingUtf8: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingUtf8',
    {
      defaultMessage: 'UTF-8',
    }
  ),

  settingsEncodingUtf16: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingUtf16',
    {
      defaultMessage: 'UTF-16',
    }
  ),

  settingsEncodingIso88591: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingIso88591',
    {
      defaultMessage: 'ISO-8859-1',
    }
  ),

  settingsEncodingUsAscii: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingUsAscii',
    {
      defaultMessage: 'US-ASCII',
    }
  ),

  settingsEncodingWindows1252: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingWindows1252',
    {
      defaultMessage: 'windows-1252',
    }
  ),

  settingsQuoteLabel: i18n.translate('xpack.dataFederation.createDatasetForm.settingsQuoteLabel', {
    defaultMessage: 'Quote character',
  }),

  settingsQuotePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsQuotePlaceholder',
    {
      defaultMessage: 'Enter a quote character',
    }
  ),

  settingsCsvCharactersNotDistinct: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsCsvCharactersNotDistinct',
    {
      defaultMessage:
        'Delimiter, quote character, and escape character must all be different, including their defaults.',
    }
  ),
  settingsQuoteInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsQuoteInvalidCharacterOrNone',
    {
      defaultMessage: "Must be a single character, \\t, \\\\, or 'none'.",
    }
  ),

  settingsEscapeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapeLabel',
    {
      defaultMessage: 'Escape character',
    }
  ),

  settingsEscapePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapePlaceholder',
    {
      defaultMessage: 'Enter an escape character',
    }
  ),

  settingsEscapeInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapeInvalidCharacterOrNone',
    {
      defaultMessage: "Must be a single character, \\t, \\\\, or 'none'.",
    }
  ),

  settingsColumnPrefixLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsColumnPrefixLabel',
    {
      defaultMessage: 'Column prefix',
    }
  ),

  settingsColumnPrefixDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsColumnPrefixDescription',
    {
      defaultMessage: 'Prefix for generated column names when no header row is present.',
    }
  ),

  settingsColumnPrefixPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsColumnPrefixPlaceholder',
    {
      defaultMessage: 'Enter a column prefix',
    }
  ),

  settingsTrimSpacesLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsTrimSpacesLabel',
    {
      defaultMessage: 'Trim whitespace',
    }
  ),

  settingsTrimSpacesDescription: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsTrimSpacesDescription',
    {
      defaultMessage: 'Remove surrounding ASCII whitespace from string field values.',
    }
  ),

  settingsTrimSpacesPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsTrimSpacesPlaceholder',
    {
      defaultMessage: 'Select trim spaces',
    }
  ),

  settingsDatetimeFormatLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDatetimeFormatLabel',
    {
      defaultMessage: 'Date and time format',
    }
  ),

  settingsDatetimeFormatPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDatetimeFormatPlaceholder',
    {
      defaultMessage: 'Select or enter a datetime format',
    }
  ),

  // Additional settings (info icon tooltip) strings
  additionalSettingsInfoIconAriaLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.infoIconAriaLabel',
    {
      defaultMessage: 'More information',
    }
  ),
  settingsFileExclusionsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.fileExclusions.description',
    {
      defaultMessage:
        'Patterns naming objects to drop from wildcard discovery. Default skips files starting with _ or . and _temporary/ and _delta_log/ directories. Setting replaces the default list entirely.',
    }
  ),
  settingsPartitionDetectionDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.partitionDetection.description',
    { defaultMessage: 'How partitions are discovered in the resource path' }
  ),
  settingsPartitionPathDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.partitionPath.description',
    {
      defaultMessage:
        'Only used when partition detection is Template. If your partition path is not available, create a custom one.',
    }
  ),
  settingsErrorModeDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.errorMode.description',
    { defaultMessage: 'What happens when a row cannot be parsed.' }
  ),
  settingsMaxErrorsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.maxErrors.description',
    {
      defaultMessage: 'Maximum number of row errors before failing.',
    }
  ),
  settingsMaxErrorRatioDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.maxErrorRatio.description',
    {
      defaultMessage: 'Maximum ratio of row errors before failing (0 to 1).',
    }
  ),
  settingsDelimiterDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.delimiter.description',
    {
      defaultMessage:
        'The character that separates fields. If your delimiter is not available, create a custom one.',
    }
  ),
  settingsQuoteModeDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.quoteMode.description',
    {
      defaultMessage: 'How quoting and escaping are handled while reading fields.',
    }
  ),
  settingsSkipRowsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.skipRows.description',
    {
      defaultMessage:
        'Number of leading rows to skip before reading data. Blank and comment lines do not count.',
    }
  ),
  settingsDatetimeFormatDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormat.description',
    {
      defaultMessage:
        'Pattern used to parse date and time values. If your datetime format is not available, create a custom one.',
    }
  ),
  settingsNullValueDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.nullValue.description',
    {
      defaultMessage:
        'The string treated as null, for example NULL or NA. If your null value is not available, create a custom one.',
    }
  ),
  settingsDatetimeFormatNdjsonDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormatNdjson.description',
    {
      defaultMessage:
        'Pattern used to parse date and time values. If your datetime format is not available, create a custom one.',
    }
  ),
  settingsDatetimeFormatNdjsonAdvancedDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormatNdjsonAdvanced.description',
    {
      defaultMessage: 'Controls how Elastic interprets date and time values.',
    }
  ),

  saveButton: i18n.translate('xpack.dataFederation.createDatasetForm.saveButton', {
    defaultMessage: 'Save',
  }),

  learnMore: i18n.translate('xpack.dataFederation.createDatasetForm.learnMore', {
    defaultMessage: 'Learn more',
  }),
};
