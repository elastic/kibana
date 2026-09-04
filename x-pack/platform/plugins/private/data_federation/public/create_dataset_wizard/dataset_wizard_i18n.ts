/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const datasetWizardStrings = {
  createPageTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.createPageTitle', {
      defaultMessage: 'Add dataset',
    }),

  editPageTitle: (datasetName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.editPageTitle', {
      defaultMessage: 'Edit dataset: {datasetName}',
      values: { datasetName },
    }),

  clonePageTitle: (datasetName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.clonePageTitle', {
      defaultMessage: 'Clone dataset: {datasetName}',
      values: { datasetName },
    }),

  backAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.backAriaLabel', {
      defaultMessage: 'Back to datasets',
    }),

  stepLogistics: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepLogistics', {
      defaultMessage: 'Define dataset',
    }),

  stepFile: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepFile', {
      defaultMessage: 'File',
    }),

  stepDataSource: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepDataSource', {
      defaultMessage: 'Data source',
    }),

  stepAdditionalSettings: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepAdditionalSettings', {
      defaultMessage: 'Additional settings',
    }),

  stepSchemaMappings: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepSchemaMappings', {
      defaultMessage: 'Schema mappings',
    }),

  stepPreviewResults: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepPreviewResults', {
      defaultMessage: 'Preview results',
    }),

  stepReview: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepReview', {
      defaultMessage: 'Review',
    }),

  logisticsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.logisticsTitle', {
      defaultMessage: 'Define dataset',
    }),

  logisticsDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.logisticsDescription', {
      defaultMessage: 'Select the source and define which dataset you want added',
    }),

  fileTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileTitle', {
      defaultMessage: 'File',
    }),

  fileDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDescription', {
      defaultMessage:
        'Point to the files you want to query. Details we can read from the URI are shown below it.',
    }),

  fileUriLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileUriLabel', {
      defaultMessage: 'File URI',
    }),

  fileUriHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileUriHelp', {
      defaultMessage: 'Globs are supported, for example s3://acme-logs/vpcflow/**/*.parquet',
    }),

  fileDetectedTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedTitle', {
      defaultMessage: 'Detected from URI',
    }),

  fileDetectedTypeLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedTypeLabel', {
      defaultMessage: 'Type',
    }),

  fileDetectedBucketLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedBucketLabel', {
      defaultMessage: 'Bucket',
    }),

  fileDetectedPrefixLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedPrefixLabel', {
      defaultMessage: 'Prefix',
    }),

  fileDetectedFormatHintLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedFormatHintLabel', {
      defaultMessage: 'Format hint',
    }),

  fileDetectedNotDetected: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.fileDetectedNotDetected', {
      defaultMessage: 'Not detected',
    }),

  dataSourceStepTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceStepTitle', {
      defaultMessage: 'Data source',
    }),

  dataSourceStepDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceStepDescription', {
      defaultMessage: 'Choose how Elastic connects to the bucket holding these files.',
    }),

  dataSourceModeLegend: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceModeLegend', {
      defaultMessage: 'Data source setup',
    }),

  dataSourceModeExisting: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceModeExisting', {
      defaultMessage: 'Use existing',
    }),

  dataSourceModeCreate: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceModeCreate', {
      defaultMessage: 'Create new',
    }),

  dataSourceSelectionRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceSelectionRequired', {
      defaultMessage: 'Select a data source to continue.',
    }),

  connectionNameLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionNameLabel', {
      defaultMessage: 'Connection name',
    }),

  connectionNameRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionNameRequired', {
      defaultMessage: 'Connection name is required.',
    }),

  connectionNameAlreadyExists: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionNameAlreadyExists', {
      defaultMessage: 'A data source with this name already exists.',
    }),

  dataSourceRegionDetected: (region: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceRegionDetected', {
      defaultMessage: 'AWS region {region}, detected from the bucket.',
      values: { region },
    }),

  dataSourceRegionDetectedUnknown: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceRegionDetectedUnknown', {
      defaultMessage: 'The AWS region is detected from the bucket.',
    }),

  connectionTestTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionTestTitle', {
      defaultMessage: 'Test connection',
    }),

  connectionTestDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionTestDescription', {
      defaultMessage:
        'Optional. Check that Elasticsearch can reach this data source before you continue.',
    }),

  connectionTestButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectionTestButton', {
      defaultMessage: 'Test',
    }),

  datasetNameEsqlHelp: (query: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNameEsqlHelp', {
      defaultMessage: 'Used in ES|QL queries as {query}',
      values: { query },
    }),

  dataSourceLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceLabel', {
      defaultMessage: 'Data source',
    }),

  dataSourcePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourcePlaceholder', {
      defaultMessage: 'Select an existing data source or connect a new one',
    }),

  dataSourceSearchPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceSearchPlaceholder', {
      defaultMessage: 'Search data sources',
    }),

  connectNewDataSource: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectNewDataSource', {
      defaultMessage: 'Connect new data source',
    }),

  datasetNameLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNameLabel', {
      defaultMessage: 'Dataset name',
    }),

  datasetNamePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNamePlaceholder', {
      defaultMessage: 'e.g. my-dataset',
    }),

  datasetNameHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNameHelp', {
      defaultMessage:
        'Unique name for use in queries. All lowercase, dash, underscore, and numbers are supported',
    }),

  descriptionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.descriptionLabel', {
      defaultMessage: 'Description (optional)',
    }),

  descriptionHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.descriptionHelp', {
      defaultMessage: 'A brief description to identify this dataset',
    }),

  descriptionPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.descriptionPlaceholder', {
      defaultMessage: 'Type text',
    }),

  resourceLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourcePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourcePlaceholder', {
      defaultMessage: 'Type text',
    }),

  resourceHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource',
    }),

  regionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionLabel', {
      defaultMessage: 'Region',
    }),

  regionPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionPlaceholder', {
      defaultMessage: 'Select region',
    }),

  regionSearchPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionSearchPlaceholder', {
      defaultMessage: 'Search regions',
    }),

  regionRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionRequired', {
      defaultMessage: 'Region is required.',
    }),

  placeholderStepDescription: (stepTitle: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.placeholderStepDescription', {
      defaultMessage: '{stepTitle} will be implemented in a follow-up step.',
      values: { stepTitle },
    }),

  cancelButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  backButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.backButton', {
      defaultMessage: 'Back',
    }),

  nextButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nextButton', {
      defaultMessage: 'Next',
    }),

  saveAndContinueButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.saveAndContinueButton', {
      defaultMessage: 'Save and continue',
    }),

  saveAndContinueAnywaysButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.saveAndContinueAnywaysButton', {
      defaultMessage: 'Save and continue anyways',
    }),

  addButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.addButton', {
      defaultMessage: 'Add dataset',
    }),

  saveButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.saveButton', {
      defaultMessage: 'Save dataset',
    }),

  nameRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nameRequired', {
      defaultMessage: 'Dataset name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nameAlreadyExists', {
      defaultMessage: 'A dataset with this name already exists.',
    }),

  dataSourceRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceRequired', {
      defaultMessage: 'Data source is required.',
    }),

  resourceRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),

  resourceInvalidS3: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceInvalidS3', {
      defaultMessage:
        'Resource must use one of the supported URI schemes: s3://, s3a://, or s3n://.',
    }),

  resourceInvalidGcs: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceInvalidGcs', {
      defaultMessage: 'Resource must use the gs:// URI scheme.',
    }),

  resourceInvalidAzure: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceInvalidAzure', {
      defaultMessage: 'Resource must use the https:// URI scheme.',
    }),

  glueDatabaseRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueDatabaseRequired', {
      defaultMessage: 'Glue database is required.',
    }),

  glueTableNameRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueTableNameRequired', {
      defaultMessage: 'Glue table name is required.',
    }),

  additionalSettingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.additionalSettingsTitle', {
      defaultMessage: 'Additional settings (optional)',
    }),

  additionalSettingsTitleFlow3: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.additionalSettingsTitleFlow3', {
      defaultMessage: 'Additional settings',
    }),

  additionalSettingsDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.additionalSettingsDescription', {
      defaultMessage: 'Settings you leave unchanged use the default for your file format.',
    }),

  dataSourceSetupWarningTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceSetupWarningTitle', {
      defaultMessage:
        "We couldn't reach this data source. You can continue, but review your setup if a connection was expected.",
    }),

  formatAutoDetectedSuffix: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.formatAutoDetectedSuffix', {
      defaultMessage: '(auto-detected)',
    }),

  commonSettingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.commonSettingsTitle', {
      defaultMessage: 'Common settings (optional)',
    }),

  advancedSettingsTitleFlow3: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.advancedSettingsTitleFlow3', {
      defaultMessage: 'Advanced settings (optional)',
    }),

  settingsCustomJsonLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonLabel', {
      defaultMessage: 'Custom settings (JSON)',
    }),

  settingsCustomJsonHelpText: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonHelpText', {
      defaultMessage: 'Optional JSON overrides for advanced dataset settings.',
    }),

  settingsCustomJsonDocsLinkLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonDocsLinkLabel', {
      defaultMessage: 'Learn more',
    }),

  settingsCustomJsonAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonAriaLabel', {
      defaultMessage: 'Custom dataset settings JSON editor',
    }),

  settingsCustomJsonInvalidSyntax: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonInvalidSyntax', {
      defaultMessage: 'Invalid JSON format.',
    }),

  settingsCustomJsonInvalidObject: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.settingsCustomJsonInvalidObject', {
      defaultMessage: 'Custom settings must be a JSON object.',
    }),

  delimiterOptionComma: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionComma', {
      defaultMessage: 'Comma (,)',
    }),

  delimiterOptionTab: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionTab', {
      defaultMessage: 'Tab (\\t)',
    }),

  delimiterOptionSemicolon: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionSemicolon', {
      defaultMessage: 'Semicolon (;)',
    }),

  delimiterOptionPipe: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionPipe', {
      defaultMessage: 'Pipe (|)',
    }),

  accordionStructureAndSchema: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionStructureAndSchema', {
      defaultMessage: 'Structure and schema',
    }),

  accordionTextParsing: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionTextParsing', {
      defaultMessage: 'Text parsing',
    }),

  accordionColumnsAndValues: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionColumnsAndValues', {
      defaultMessage: 'Columns and values',
    }),

  accordionErrorHandling: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionErrorHandling', {
      defaultMessage: 'Error handling',
    }),

  accordionLimitsAndPerformance: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionLimitsAndPerformance', {
      defaultMessage: 'Limits and performance',
    }),

  accordionComingSoon: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionComingSoon', {
      defaultMessage: 'Coming soon',
    }),

  schemaSettingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaSettingsTitle', {
      defaultMessage: 'Schema settings (optional)',
    }),

  schemaMappingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingsTitle', {
      defaultMessage: 'Schema mappings',
    }),

  previewResultsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.previewResultsTitle', {
      defaultMessage: 'Preview results (optional)',
    }),

  schemaMappingsDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingsDescription', {
      defaultMessage: 'Optional definition of how documents should be indexed',
    }),

  schemaMappingsDescriptionFlow3: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingsDescriptionFlow3', {
      defaultMessage:
        "Optional definition of how documents should be indexed. Elastic infers the schema at query time by default. You can manually map desired fields below, and we'll infer the rest of the schema.",
    }),

  inferSchemaButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.inferSchemaButton', {
      defaultMessage: 'Preview inferred schema',
    }),

  dynamicFieldsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsTitle', {
      defaultMessage: 'Dynamic fields',
    }),

  dynamicFieldsEnabledToggle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsEnabledToggleSwitch', {
      defaultMessage: 'Enabled',
    }),

  dynamicFieldsDisabled: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsDisabled', {
      defaultMessage:
        'Only mapped fields will be used. Unmapped fields will not be inferred at query time.',
    }),

  mappedFieldsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.mappedFieldsTitle', {
      defaultMessage: 'Mapped fields (optional)',
    }),

  mapFieldButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.mapFieldButton', {
      defaultMessage: 'Map',
    }),

  mapFieldAriaLabel: (fieldName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.mapFieldAriaLabel', {
      defaultMessage: 'Map {fieldName}',
      values: { fieldName },
    }),

  dynamicFieldsEmpty: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsEmpty', {
      defaultMessage:
        'Fields that are not mapped will remain dynamic and will be inferred at query time. You can infer schema now to preview what the mapping would look like based on what is currently stored on your dataset.',
    }),

  dynamicFieldsEnabledHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsEnabledHelp', {
      defaultMessage:
        'Fields that are not mapped will remain dynamic and will be inferred at query time.',
    }),

  dynamicFieldsTableCaption: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldsTableCaption', {
      defaultMessage: 'Dynamic fields',
    }),

  inferMissingFieldsButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.inferMissingFieldsButton', {
      defaultMessage: 'Infer missing fields',
    }),

  inferSchemaMoreOptionsAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.inferSchemaMoreOptionsAriaLabel', {
      defaultMessage: 'More infer schema options',
    }),

  addFieldButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.addFieldButton', {
      defaultMessage: 'Add field',
    }),

  schemaMappingModeLegend: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingModeLegend', {
      defaultMessage: 'Schema mapping mode',
    }),

  schemaMappingModeAutomatic: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingModeAutomatic', {
      defaultMessage: 'Inferred from dataset',
    }),

  schemaMappingModeAutomaticFlow1: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingModeAutomaticFlow1', {
      defaultMessage: 'Automatic',
    }),

  schemaMappingModeAwsGlueTable: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingModeAwsGlueTable', {
      defaultMessage: 'AWS Glue table',
    }),

  schemaMappingModeManual: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingModeManual', {
      defaultMessage: 'Manual',
    }),

  schemaMappingAutomaticDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingAutomaticDescription', {
      defaultMessage:
        'Elastic infers field names and types from your file. Review the sample below and adjust any type before continuing. Parquet uses embedded schema for highest fidelity; NDJSON and CSV use best-effort inference.',
    }),

  schemaMappingAutomaticDescriptionFlow1: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingAutomaticDescriptionFlow1', {
      defaultMessage:
        'Elastic will sample the file and infer column names and types automatically. Parquet files carry embedded schema and are inferred with highest fidelity. For NDJSON and CSV, a best-effort type inference is applied.',
    }),

  automaticSchemaSampleFieldColumn: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleFieldColumn', {
      defaultMessage: 'Field',
    }),

  automaticSchemaSampleTypeColumn: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleTypeColumn', {
      defaultMessage: 'Type',
    }),

  dynamicFieldDataTypeAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dynamicFieldDataTypeAriaLabel', {
      defaultMessage: 'Data type',
    }),

  automaticSchemaSampleTableCaption: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleTableCaption', {
      defaultMessage: 'Inferred schema sample',
    }),

  automaticSchemaSampleTypeSelectAriaLabel: (fieldName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleTypeSelectAriaLabel', {
      defaultMessage: 'Type for {fieldName}',
      values: { fieldName },
    }),

  automaticSchemaSampleResetTypeAriaLabel: (fieldName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleResetTypeAriaLabel', {
      defaultMessage: 'Reset type for {fieldName} to auto-detected value',
      values: { fieldName },
    }),

  automaticSchemaSampleResetTypeTooltip: (inferredType: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.automaticSchemaSampleResetTypeTooltip', {
      defaultMessage: 'Reset to the auto-detected type ({inferredType}).',
      values: { inferredType },
    }),

  schemaMappingAwsGlueTableDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingAwsGlueTableDescription', {
      defaultMessage:
        'Use an AWS Glue table schema to define column names and types from the AWS Glue Data Catalog.',
    }),

  schemaMappingAwsGlueCalloutTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingAwsGlueCalloutTitle', {
      defaultMessage: 'Schema from Glue',
    }),

  schemaMappingAwsGlueCalloutDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingAwsGlueCalloutDescription', {
      defaultMessage:
        'Column names, types, and partition keys are read from the AWS Glue Data Catalog instead of sampling the files. Ensures consistent typing and enables partition pruning on queries.',
    }),

  glueDatabaseLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueDatabaseLabel', {
      defaultMessage: 'Glue database',
    }),

  glueDatabasePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueDatabasePlaceholder', {
      defaultMessage: 'e.g. security_logs',
    }),

  glueDatabaseHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueDatabaseHelp', {
      defaultMessage: 'The Glue catalog database that contains the table',
    }),

  glueTableNameLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueTableNameLabel', {
      defaultMessage: 'Glue table name',
    }),

  glueTableNamePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueTableNamePlaceholder', {
      defaultMessage: 'e.g. cloudtrail_events',
    }),

  glueTableNameHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueTableNameHelp', {
      defaultMessage: 'Must point to the same S3 path as the resource path above',
    }),

  glueCatalogRegionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueCatalogRegionLabel', {
      defaultMessage: 'Glue catalog region',
    }),

  glueCatalogRegionPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueCatalogRegionPlaceholder', {
      defaultMessage: 'Same as data source region',
    }),

  glueCatalogRegionHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueCatalogRegionHelp', {
      defaultMessage:
        'Override only if the Glue catalog is in a different region from the S3 bucket',
    }),

  glueAwsAccountIdLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueAwsAccountIdLabel', {
      defaultMessage: 'AWS account ID (optional)',
    }),

  glueAwsAccountIdPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueAwsAccountIdPlaceholder', {
      defaultMessage: 'e.g. 112233445566',
    }),

  glueAwsAccountIdHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.glueAwsAccountIdHelp', {
      defaultMessage: 'Leave blank to use the same account as the data source credentials',
    }),

  gluePermissionsAccordionTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.gluePermissionsAccordionTitle', {
      defaultMessage: 'Required Glue permissions',
    }),

  gluePermissionsAccordionDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.gluePermissionsAccordionDescription', {
      defaultMessage: 'Add to your IAM policy or role',
    }),

  gluePermissionsIntro: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.gluePermissionsIntro', {
      defaultMessage: 'Add these to the IAM policy created in the data source setup.',
    }),

  reviewGlueDatabaseLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewGlueDatabaseLabel', {
      defaultMessage: 'Glue database',
    }),

  reviewGlueTableNameLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewGlueTableNameLabel', {
      defaultMessage: 'Glue table name',
    }),

  reviewGlueCatalogRegionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewGlueCatalogRegionLabel', {
      defaultMessage: 'Glue catalog region',
    }),

  reviewGlueAwsAccountIdLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewGlueAwsAccountIdLabel', {
      defaultMessage: 'AWS account ID',
    }),

  schemaMappingManualDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.schemaMappingManualDescription', {
      defaultMessage:
        'Manually define column names and types for your dataset. This option will be available in a follow-up step.',
    }),

  reviewTitle: (datasetName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewTitle', {
      defaultMessage: 'Review configuration for {datasetName}',
      values: { datasetName },
    }),

  reviewUntitledDataset: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewUntitledDataset', {
      defaultMessage: 'your dataset',
    }),

  reviewSummaryTabTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewSummaryTabTitle', {
      defaultMessage: 'Summary',
    }),

  reviewPreviewTabTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewPreviewTabTitle', {
      defaultMessage: 'Preview configuration',
    }),

  reviewPreviewTabTitleFlow1: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewPreviewTabTitleFlow1', {
      defaultMessage: 'Preview',
    }),

  reviewPreviewResultsTabTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewPreviewResultsTabTitle', {
      defaultMessage: 'Preview results',
    }),

  reviewRequestTabTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewRequestTabTitle', {
      defaultMessage: 'Request',
    }),

  reviewLogisticsSectionTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewLogisticsSectionTitle', {
      defaultMessage: 'Define dataset',
    }),

  reviewSettingsSectionTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewSettingsSectionTitle', {
      defaultMessage: 'Additional settings',
    }),

  reviewSchemaMappingsSectionTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewSchemaMappingsSectionTitle', {
      defaultMessage: 'Schema mappings',
    }),

  reviewDataSourceTypeLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewDataSourceTypeLabel', {
      defaultMessage: 'Type',
    }),

  reviewNoneValue: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewNoneValue', {
      defaultMessage: 'None',
    }),

  reviewNoSettingsValue: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewNoSettingsValue', {
      defaultMessage: 'No additional settings configured.',
    }),

  reviewDefaultBadge: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewDefaultBadge', {
      defaultMessage: 'Default',
    }),

  reviewModifiedBadge: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewModifiedBadge', {
      defaultMessage: 'Modified',
    }),

  reviewCustomBadge: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewCustomBadge', {
      defaultMessage: 'Custom',
    }),

  reviewManualMappingsLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewManualMappingsLabel', {
      defaultMessage: 'Mapped fields',
    }),

  reviewDynamicFieldsOn: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewDynamicFieldsOn', {
      defaultMessage: 'On',
    }),

  reviewDynamicFieldsOff: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewDynamicFieldsOff', {
      defaultMessage: 'Off',
    }),

  reviewManualMappingsCount: (count: number) =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewManualMappingsCount', {
      defaultMessage: '{count, plural, one {# field} other {# fields}}',
      values: { count },
    }),

  reviewAutomaticFieldTypesLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewAutomaticFieldTypesLabel', {
      defaultMessage: 'Manual changes',
    }),

  reviewAutomaticFieldTypesCount: (count: number) =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewAutomaticFieldTypesCount', {
      defaultMessage: '{count, plural, one {# type} other {# types}}',
      values: { count },
    }),

  reviewPreviewDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewPreviewDescription', {
      defaultMessage: 'This is the resolved dataset configuration that will be saved.',
    }),

  reviewRequestDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.reviewRequestDescription', {
      defaultMessage: 'This request will create or update the dataset.',
    }),

  testConfigurationButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.testConfigurationButton', {
      defaultMessage: 'Test configuration',
    }),

  testConfigurationPreviewTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.testConfigurationPreviewTitle', {
      defaultMessage: 'Preview results',
    }),

  testConfigurationPreviewDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.testConfigurationPreviewDescription', {
      defaultMessage:
        'Shows the first 10 rows read from your dataset using the current configuration.',
    }),

  previewResultsButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.previewResultsButton', {
      defaultMessage: 'Preview results',
    }),

  testConfigurationPreviewTableCaption: (rowCount: number) =>
    i18n.translate('xpack.dataFederation.datasetWizard.testConfigurationPreviewTableCaption', {
      defaultMessage: 'First {rowCount} rows',
      values: { rowCount },
    }),

  testConfigurationPreviewCloseAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.testConfigurationPreviewCloseAriaLabel', {
      defaultMessage: 'Close preview',
    }),
};
