/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const addDataSetFlyoutStrings = {
  title: (dataSource: string) =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.title', {
      defaultMessage: 'Add dataset from {dataSource}',
      values: { dataSource },
    }),

  titlePickSource: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.titlePickSource', {
      defaultMessage: 'Add dataset',
    }),

  titleEdit: (dataSetId: string) =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.titleEdit', {
      defaultMessage: 'Edit dataset: {dataSetId}',
      values: { dataSetId },
    }),

  createDescription: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.createDescription', {
      defaultMessage: 'Select the data within a connected data source you want to query with ES|QL.',
    }),

  sourceLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceLabel', {
      defaultMessage: 'Data source',
    }),

  sourceHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceHelp', {
      defaultMessage: 'Select the external data source this dataset belongs to.',
    }),

  sourcePlaceholder: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourcePlaceholder', {
      defaultMessage: 'Select a data source',
    }),

  sourceNoMatches: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceNoMatches', {
      defaultMessage: 'No data sources match your search.',
    }),

  addNewSource: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.addNewSource', {
      defaultMessage: 'Add new data source',
    }),

  sourceRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceRequired', {
      defaultMessage: 'Select a data source.',
    }),

  nameLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.nameLabel', {
      defaultMessage: 'Name',
    }),

  nameHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.nameHelp', {
      defaultMessage: 'Unique name for use in queries',
    }),

  resourceLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourceHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource.',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  advancedSettingsShow: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.advancedSettingsShow', {
      defaultMessage: 'Show advanced settings',
    }),

  advancedSettingsHide: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.advancedSettingsHide', {
      defaultMessage: 'Hide advanced settings',
    }),

  partitionDetectionLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionDetectionLabel', {
      defaultMessage: 'Partition detection',
    }),

  partitionOptionDefault: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionDefault', {
      defaultMessage: 'Default',
    }),

  partitionOptionAuto: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionAuto', {
      defaultMessage: 'Auto',
    }),

  partitionOptionTemplate: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionTemplate', {
      defaultMessage: 'Template',
    }),

  partitionOptionNone: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionNone', {
      defaultMessage: 'None',
    }),

  partitionOptionHive: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionHive', {
      defaultMessage: 'Hive',
    }),

  formatLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatLabel', {
      defaultMessage: 'Format',
    }),

  formatParquet: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatParquet', {
      defaultMessage: 'Parquet',
    }),

  formatCsv: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatCsv', {
      defaultMessage: 'CSV',
    }),

  formatTsv: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatTsv', {
      defaultMessage: 'TSV',
    }),

  formatNdjson: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatNdjson', {
      defaultMessage: 'NDJSON',
    }),

  formatOrc: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatOrc', {
      defaultMessage: 'ORC',
    }),

  formatDefault: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.formatDefault', {
      defaultMessage: 'Select a format',
    }),

  delimiterLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.delimiterLabel', {
      defaultMessage: 'Delimiter',
    }),

  modeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.modeLabel', {
      defaultMessage: 'Mode',
    }),

  modeQuoted: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.modeQuoted', {
      defaultMessage: 'Quoted',
    }),

  modeEscaped: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.modeEscaped', {
      defaultMessage: 'Escaped',
    }),

  modePlain: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.modePlain', {
      defaultMessage: 'Plain',
    }),

  headerRowLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.headerRowLabel', {
      defaultMessage: 'Header row',
    }),

  headerRowYes: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.headerRowYes', {
      defaultMessage: 'Yes',
    }),

  headerRowNo: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.headerRowNo', {
      defaultMessage: 'No',
    }),

  headerRowDefault: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.headerRowDefault', {
      defaultMessage: 'Default',
    }),

  nullValueLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.nullValueLabel', {
      defaultMessage: 'Null value',
    }),

  encodingLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.encodingLabel', {
      defaultMessage: 'Encoding',
    }),

  errorModeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.errorModeLabel', {
      defaultMessage: 'Error mode',
    }),

  errorModeFailFast: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.errorModeFailFast', {
      defaultMessage: 'Fail fast',
    }),

  errorModeSkipRow: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.errorModeSkipRow', {
      defaultMessage: 'Skip row',
    }),

  errorModeNullField: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.errorModeNullField', {
      defaultMessage: 'Null field',
    }),

  maxErrorsLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.maxErrorsLabel', {
      defaultMessage: 'Max errors',
    }),

  maxErrorRatioLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.maxErrorRatioLabel', {
      defaultMessage: 'Max error ratio',
    }),

  quoteLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.quoteLabel', {
      defaultMessage: 'Quote character',
    }),

  escapeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.escapeLabel', {
      defaultMessage: 'Escape character',
    }),

  commentLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.commentLabel', {
      defaultMessage: 'Comment prefix',
    }),

  columnPrefixLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.columnPrefixLabel', {
      defaultMessage: 'Column prefix',
    }),

  datetimeFormatLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.datetimeFormatLabel', {
      defaultMessage: 'Datetime format',
    }),

  multiValueSyntaxLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.multiValueSyntaxLabel', {
      defaultMessage: 'Multi-value syntax',
    }),

  multiValueNone: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.multiValueNone', {
      defaultMessage: 'None',
    }),

  multiValueBrackets: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.multiValueBrackets', {
      defaultMessage: 'Brackets',
    }),

  maxFieldSizeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.maxFieldSizeLabel', {
      defaultMessage: 'Max field size',
    }),

  schemaSampleSizeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.schemaSampleSizeLabel', {
      defaultMessage: 'Schema sample size',
    }),

  segmentSizeLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.segmentSizeLabel', {
      defaultMessage: 'Segment size',
    }),

  optimizedReaderLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.optimizedReaderLabel', {
      defaultMessage: 'Optimized reader',
    }),

  lateMaterializationLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.lateMaterializationLabel', {
      defaultMessage: 'Late materialization',
    }),

  booleanTrue: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.booleanTrue', {
      defaultMessage: 'True',
    }),

  booleanFalse: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.booleanFalse', {
      defaultMessage: 'False',
    }),

  booleanDefault: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.booleanDefault', {
      defaultMessage: 'Default',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.saveButton', {
      defaultMessage: 'Add',
    }),

  editSaveButton: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.editSaveButton', {
      defaultMessage: 'Save',
    }),

  cancelButton: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  nameRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.nameRequired', {
      defaultMessage: 'Name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.nameAlreadyExists', {
      defaultMessage: 'A dataset with this name already exists.',
    }),

  resourceRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),
};
