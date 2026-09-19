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
  editPageTitle: (id: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.editPageTitle', {
      defaultMessage: 'Edit dataset: {id}',
      values: { id },
    }),
  datasetStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.datasetStepLabel', {
    defaultMessage: 'Define dataset',
  }),
  advancedStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.advancedStepLabel', {
    defaultMessage: 'Advanced settings',
  }),
  reviewStepLabel: i18n.translate('xpack.dataFederation.createDatasetWizard.reviewStepLabel', {
    defaultMessage: 'Review',
  }),
  notSet: i18n.translate('xpack.dataFederation.createDatasetWizard.notSetValue', {
    defaultMessage: 'Not set',
  }),
  editButton: i18n.translate('xpack.dataFederation.createDatasetWizard.editButtonLabel', {
    defaultMessage: 'Edit',
  }),

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

  settingsFormatParquet: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatParquet',
    {
      defaultMessage: 'Parquet',
    }
  ),

  settingsFormatCsv: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatCsv', {
    defaultMessage: 'CSV',
  }),

  settingsFormatNdjson: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsFormatNdjson',
    {
      defaultMessage: 'NDJSON',
    }
  ),

  settingsFormatTsv: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatTsv', {
    defaultMessage: 'TSV',
  }),

  settingsFormatOrc: i18n.translate('xpack.dataFederation.createDatasetForm.settingsFormatOrc', {
    defaultMessage: 'ORC',
  }),

  settingsErrorModeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeLabel',
    {
      defaultMessage: 'Error mode',
    }
  ),

  settingsErrorModePlaceholder: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModePlaceholder',
    {
      defaultMessage: 'Default',
    }
  ),

  settingsErrorModeFailFast: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeFailFast',
    {
      defaultMessage: 'Fail fast',
    }
  ),

  settingsErrorModeSkipRow: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeSkipRow',
    {
      defaultMessage: 'Skip row',
    }
  ),

  settingsErrorModeNullField: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsErrorModeNullField',
    {
      defaultMessage: 'Null field',
    }
  ),

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

  settingsMaxErrorsInvalid: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsMaxErrorsInvalid',
    {
      defaultMessage: 'Must be a non-negative integer.',
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

  settingsPartitionDetectionHive: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionHive',
    {
      defaultMessage: 'Hive',
    }
  ),

  settingsPartitionDetectionNone: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsPartitionDetectionNone',
    {
      defaultMessage: 'None',
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

  settingsDelimiterLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterLabel',
    {
      defaultMessage: 'Delimiter',
    }
  ),

  settingsDelimiterHelp: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsDelimiterHelp',
    {
      defaultMessage: 'The character that separates fields.',
    }
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
      defaultMessage: 'Character encoding of the file.',
    }
  ),

  settingsQuoteLabel: i18n.translate('xpack.dataFederation.createDatasetForm.settingsQuoteLabel', {
    defaultMessage: 'Quote character',
  }),

  settingsQuoteHelp: i18n.translate('xpack.dataFederation.createDatasetForm.settingsQuoteHelp', {
    defaultMessage: 'The character used to quote fields.',
  }),

  settingsEscapeLabel: i18n.translate(
    'xpack.dataFederation.createDatasetForm.settingsEscapeLabel',
    {
      defaultMessage: 'Escape character',
    }
  ),

  settingsEscapeHelp: i18n.translate('xpack.dataFederation.createDatasetForm.settingsEscapeHelp', {
    defaultMessage: 'The character used to escape special characters.',
  }),

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
      defaultMessage: 'Prefix for generated column names when no header row is present.',
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

  addButton: i18n.translate('xpack.dataFederation.createDatasetForm.addButton', {
    defaultMessage: 'Add',
  }),

  saveButton: i18n.translate('xpack.dataFederation.createDatasetForm.saveButton', {
    defaultMessage: 'Save',
  }),

  learnMore: i18n.translate('xpack.dataFederation.createDatasetForm.learnMore', {
    defaultMessage: 'Learn more',
  }),

  settingsLearnMore: i18n.translate('xpack.dataFederation.createDatasetForm.settingsLearnMore', {
    defaultMessage: 'Learn more about dataset settings',
  }),
};
