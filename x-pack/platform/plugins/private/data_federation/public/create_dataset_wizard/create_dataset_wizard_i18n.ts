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
      defaultMessage: 'Select the source and define which dataset you want added',
    }
  ),
  additionalStepLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.advancedStepLabel',
    {
      defaultMessage: 'Additional settings',
    }
  ),
  additionalStepSubheader: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalStepSubheader',
    {
      defaultMessage: 'Settings you leave unchanged use the default for your file format.',
    }
  ),
  mappingStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.mappingStepLabel', {
    defaultMessage: 'Mapping',
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
      defaultMessage: 'When Define schema is selected, you must map at least one field.',
    }
  ),
  commonSettingsSectionTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.commonSettingsSectionTitle',
    {
      defaultMessage: 'Common settings (optional)',
    }
  ),
  advancedSettingsSectionTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.advancedSettingsSectionTitle',
    {
      defaultMessage: 'Advanced settings (optional)',
    }
  ),
  mappedFieldsSectionTitle: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.mappedFieldsSectionTitle',
    {
      defaultMessage: 'Mapped fields (optional)',
    }
  ),
  byDefaultSuffix: i18n.translate('xpack.dataFederation.createDatasetWizard.byDefaultSuffix', {
    defaultMessage: 'by default.',
  }),
  unbounded: i18n.translate('xpack.dataFederation.createDatasetWizard.unbounded', {
    defaultMessage: 'unbounded',
  }),
  emptyString: i18n.translate('xpack.dataFederation.createDatasetWizard.emptyString', {
    defaultMessage: 'empty string',
  }),
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
  schemaMappingModeInferred: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.schemaMappingModeInferred',
    {
      defaultMessage: 'Inferred from dataset',
    }
  ),
  schemaMappingModeDeclared: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.schemaMappingModeDeclared',
    {
      defaultMessage: 'Declared in wizard',
    }
  ),
  dynamicFieldsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.dynamicFieldsLabel',
    {
      defaultMessage: 'Dynamic fields',
    }
  ),
  mappedFieldsLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.mappedFieldsLabel', {
    defaultMessage: 'Mapped fields',
  }),
  timestampMappingLabel: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.timestampMappingLabel',
    {
      defaultMessage: 'Timeseries data',
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
  onLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.onLabel', {
    defaultMessage: 'On',
  }),
  offLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.offLabel', {
    defaultMessage: 'Off',
  }),
  saveDatasetButton: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.saveDatasetButtonLabel',
    {
      defaultMessage: 'Save dataset',
    }
  ),

  // Form strings
  editTitleWithId: (id: string) =>
    i18n.translate('xpack.dataFederation.createDatasetForm.editTitleWithId', {
      defaultMessage: 'Edit dataset: {id}',
      values: { id },
    }),

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
      'Unique name for use in queries. Lowercase letters, dashes, underscores, and numbers are supported',
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

  dataSourceEmptyHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.dataSourceEmptyHelp',
    {
      defaultMessage: 'Create a data source on the Sources tab before adding a dataset.',
    }
  ),

  resourceLabel: i18n.translate('xpack.dataFederation.createDatasetForm.resourceLabel', {
    defaultMessage: 'Resource',
  }),

  resourceHelp: i18n.translate('xpack.dataFederation.createDatasetForm.resourceHelp', {
    defaultMessage: 'URI with path and glob pattern (e.g. s3://logs-bucket/access/**/*.parquet)',
  }),

  settingsFormatRequired: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatRequired',
    {
      defaultMessage: 'Format is required.',
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
      defaultMessage: 'Stop reading as soon as an error is encountered.',
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
      defaultMessage: 'Skip rows that cannot be parsed.',
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
      defaultMessage: 'Set invalid fields to null and continue reading.',
    }
  ),

  defaultBadgeLabel: i18n.translate('xpack.dataFederation.createDatasetForm.defaultBadgeLabel', {
    defaultMessage: 'Default',
  }),

  settingsMaxErrorsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsLabel',
    {
      defaultMessage: 'Max errors',
    }
  ),

  settingsMaxErrorsHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsHelp',
    {
      defaultMessage: 'Maximum number of row errors before failing.',
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
      defaultMessage: 'Max error ratio',
    }
  ),

  settingsMaxErrorRatioHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioHelp',
    {
      defaultMessage: 'Maximum ratio of row errors before failing (0 to 1).',
    }
  ),
  settingsMaxErrorRatioPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioPlaceholder',
    {
      defaultMessage: 'Enter a ratio between 0 and 1',
    }
  ),

  settingsMaxErrorsInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsInvalid',
    {
      defaultMessage: 'Must be a positive whole number or empty.',
    }
  ),

  settingsMaxErrorRatioInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorRatioInvalid',
    {
      defaultMessage: 'Must be a number between 0 and 1.',
    }
  ),

  settingsSchemaSampleSizeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaSampleSizeLabel',
    {
      defaultMessage: 'Schema sample size',
    }
  ),

  settingsSchemaSampleSizeHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaSampleSizeHelp',
    {
      defaultMessage: 'Number of rows to sample when inferring schema.',
    }
  ),

  settingsSchemaSampleSizeInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaSampleSizeInvalid',
    {
      defaultMessage: 'Must be a positive integer.',
    }
  ),

  settingsFileExclusionsLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFileExclusionsLabel',
    {
      defaultMessage: 'File exclusions',
    }
  ),

  settingsFileExclusionsHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFileExclusionsHelp',
    {
      defaultMessage: 'Glob patterns for files to ignore when scanning the resource.',
    }
  ),

  settingsFileExclusionsPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFileExclusionsPlaceholder',
    {
      defaultMessage: 'Add a glob pattern',
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
      defaultMessage: 'Default',
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
      defaultMessage: 'Hive',
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
      defaultMessage: 'None',
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

  settingsSchemaResolutionPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionPlaceholder',
    {
      defaultMessage: 'Default',
    }
  ),

  settingsSchemaResolutionFirstFileWins: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionFirstFileWins',
    {
      defaultMessage: 'First file wins',
    }
  ),

  settingsSchemaResolutionStrict: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionStrict',
    {
      defaultMessage: 'Strict',
    }
  ),

  settingsSchemaResolutionUnionByName: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSchemaResolutionUnionByName',
    {
      defaultMessage: 'Union by name',
    }
  ),

  settingsPartitionPathLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathLabel',
    {
      defaultMessage: 'Partition path',
    }
  ),

  settingsPartitionPathHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathHelp',
    {
      defaultMessage: 'Explicit path template for partition detection.',
    }
  ),

  settingsPartitionPathRequired: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionPathRequired',
    {
      defaultMessage: 'Partition path is required.',
    }
  ),

  settingsHivePartitioningLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHivePartitioningLabel',
    {
      defaultMessage: 'Hive partitioning',
    }
  ),

  settingsHivePartitioningPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHivePartitioningPlaceholder',
    {
      defaultMessage: 'Default',
    }
  ),

  settingsHivePartitioningEnabled: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHivePartitioningEnabled',
    {
      defaultMessage: 'Enabled',
    }
  ),

  settingsHivePartitioningDisabled: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHivePartitioningDisabled',
    {
      defaultMessage: 'Disabled',
    }
  ),

  settingsOptimizedReaderLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsOptimizedReaderLabel',
    {
      defaultMessage: 'Optimized reader',
    }
  ),
  settingsOptimizedReaderPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsOptimizedReaderPlaceholder',
    {
      defaultMessage: 'Select optimized reader',
    }
  ),
  settingsLateMaterializationLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsLateMaterializationLabel',
    {
      defaultMessage: 'Late materialization',
    }
  ),
  settingsLateMaterializationPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsLateMaterializationPlaceholder',
    {
      defaultMessage: 'Select late materialization',
    }
  ),

  settingsDelimiterLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterLabel',
    {
      defaultMessage: 'Delimiter',
    }
  ),

  settingsDelimiterHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterHelp',
    {
      defaultMessage: 'The single character that separates fields.',
    }
  ),

  settingsDelimiterPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterPlaceholder',
    {
      defaultMessage: 'Select or enter a delimiter',
    }
  ),

  settingsDelimiterInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterInvalid',
    {
      defaultMessage: 'Must be a single character.',
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
      defaultMessage: 'Default',
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

  settingsHeaderRowLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowLabel',
    {
      defaultMessage: 'Header row',
    }
  ),

  settingsHeaderRowPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsHeaderRowPlaceholder',
    {
      defaultMessage: 'Default',
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

  settingsSkipRowsHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsSkipRowsHelp',
    {
      defaultMessage: 'Number of rows to skip at the start of the file.',
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

  settingsNullValueHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsNullValueHelp',
    {
      defaultMessage: 'The string treated as null, for example NULL or NA.',
    }
  ),

  settingsEncodingLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingLabel',
    {
      defaultMessage: 'Encoding',
    }
  ),

  settingsEncodingHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingHelp',
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

  settingsEncodingCustom: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingCustom',
    {
      defaultMessage: 'Custom',
    }
  ),

  settingsEncodingCustomLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingCustomLabel',
    {
      defaultMessage: 'Custom encoding',
    }
  ),

  settingsEncodingCustomPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEncodingCustomPlaceholder',
    {
      defaultMessage: 'Enter an encoding',
    }
  ),

  settingsQuoteLabel: i18n.translate('xpack.dataFederation.createDatasetForm.settingsQuoteLabel', {
    defaultMessage: 'Quote character',
  }),

  settingsQuoteHelp: i18n.translate('xpack.dataFederation.createDatasetForm.settingsQuoteHelp', {
    defaultMessage: 'The character used to quote fields.',
  }),

  settingsQuotePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsQuotePlaceholder',
    {
      defaultMessage: 'Enter a quote character',
    }
  ),

  settingsQuoteInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsQuoteInvalid',
    {
      defaultMessage: 'Must be a single character.',
    }
  ),

  settingsEscapeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapeLabel',
    {
      defaultMessage: 'Escape character',
    }
  ),

  settingsEscapeHelp: i18n.translate('xpack.dataFederation.createDatasetForm.settingsEscapeHelp', {
    defaultMessage: 'The character used to escape special characters.',
  }),

  settingsEscapePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapePlaceholder',
    {
      defaultMessage: 'Enter an escape character',
    }
  ),

  settingsEscapeInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapeInvalid',
    {
      defaultMessage: 'Must be a single character.',
    }
  ),

  settingsCommentLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsCommentLabel',
    {
      defaultMessage: 'Comment prefix',
    }
  ),

  settingsCommentHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsCommentHelp',
    {
      defaultMessage: 'Lines beginning with this prefix are skipped.',
    }
  ),

  settingsColumnPrefixLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsColumnPrefixLabel',
    {
      defaultMessage: 'Column prefix',
    }
  ),

  settingsColumnPrefixHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsColumnPrefixHelp',
    {
      defaultMessage: 'Prefix for generated column names. Only applies when header_row is false.',
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
      defaultMessage: 'Trim spaces',
    }
  ),

  settingsTrimSpacesPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsTrimSpacesPlaceholder',
    {
      defaultMessage: 'Default',
    }
  ),

  settingsTrimSpacesHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsTrimSpacesHelp',
    {
      defaultMessage: 'Removes surrounding whitespace from field values.',
    }
  ),

  settingsDatetimeFormatLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDatetimeFormatLabel',
    {
      defaultMessage: 'Datetime format',
    }
  ),

  settingsDatetimeFormatHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDatetimeFormatHelp',
    {
      defaultMessage: 'Pattern used to parse date and time values.',
    }
  ),

  settingsDatetimeFormatPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDatetimeFormatPlaceholder',
    {
      defaultMessage: 'ISO-8601',
    }
  ),

  settingsMultiValueSyntaxLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMultiValueSyntaxLabel',
    {
      defaultMessage: 'Multi-value syntax',
    }
  ),

  settingsMultiValueSyntaxPlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMultiValueSyntaxPlaceholder',
    {
      defaultMessage: 'Default',
    }
  ),

  settingsMultiValueSyntaxNone: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMultiValueSyntaxNone',
    {
      defaultMessage: 'None',
    }
  ),

  settingsMultiValueSyntaxBrackets: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMultiValueSyntaxBrackets',
    {
      defaultMessage: 'Brackets',
    }
  ),

  settingsMaxFieldSizeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxFieldSizeLabel',
    {
      defaultMessage: 'Max field size',
    }
  ),

  settingsMaxFieldSizeHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxFieldSizeHelp',
    {
      defaultMessage: 'Maximum size of a single field in bytes. 0 means unlimited.',
    }
  ),

  settingsMaxFieldSizeInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxFieldSizeInvalid',
    {
      defaultMessage: 'Must be a non-negative integer.',
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
    { defaultMessage: 'placeholder' }
  ),
  settingsPartitionPathDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.partitionPath.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsErrorModeDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.errorMode.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsMaxErrorsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.maxErrors.description',
    { defaultMessage: 'Maximum number of row errors before failing.' }
  ),
  settingsMaxErrorRatioDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.maxErrorRatio.description',
    { defaultMessage: 'placeholder' }
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
    { defaultMessage: 'placeholder' }
  ),
  settingsHeaderRowDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.headerRow.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsSkipRowsDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.skipRows.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsDatetimeFormatDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormat.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsNullValueDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.nullValue.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsEncodingDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.encoding.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsSchemaSampleSizeDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.schemaSampleSize.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsQuoteCharacterDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.quoteCharacter.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsEscapeCharacterDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.escapeCharacter.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsCommentPrefixDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.commentPrefix.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsColumnPrefixDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.columnPrefix.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsTrimSpacesDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.trimSpaces.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsMultiValueSyntaxDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.multiValueSyntax.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsMaxFieldSizeDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.maxFieldSize.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsDatetimeFormatNdjsonDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormatNdjson.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsOptimizedReaderDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.optimizedReader.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsLateMaterializationDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.lateMaterialization.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsSchemaSampleSizeNdjsonAdvancedDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.schemaSampleSizeNdjsonAdvanced.description',
    { defaultMessage: 'placeholder' }
  ),
  settingsDatetimeFormatNdjsonAdvancedDescription: i18n.translate(
    'xpack.dataFederation.createDatasetWizard.additionalSettings.datetimeFormatNdjsonAdvanced.description',
    { defaultMessage: 'placeholder' }
  ),

  addButton: i18n.translate('xpack.dataFederation.createDatasetForm.addButton', {
    defaultMessage: 'Add',
  }),

  saveButton: i18n.translate('xpack.dataFederation.createDatasetForm.saveButton', {
    defaultMessage: 'Save',
  }),

  learnMore: i18n.translate('xpack.dataFederation.createDatasetForm.learnMore', {
    defaultMessage: 'Learn more',
  }),
};
