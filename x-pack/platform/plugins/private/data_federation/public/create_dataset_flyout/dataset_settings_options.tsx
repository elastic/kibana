/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import { buildSuperSelectOption } from './dataset_settings_super_select_utils';

export const FORMAT_SUPER_SELECT_OPTIONS = (): Array<
  EuiSuperSelectOption<Exclude<DatasetFormatFormValue, ''>>
> => [
  buildSuperSelectOption({
    value: 'csv',
    label: createDatasetFlyoutStrings.settingsFormatCsv(),
    description: createDatasetFlyoutStrings.settingsFormatCsvDescription(),
  }),
  buildSuperSelectOption({
    value: 'tsv',
    label: createDatasetFlyoutStrings.settingsFormatTsv(),
    description: createDatasetFlyoutStrings.settingsFormatTsvDescription(),
  }),
  buildSuperSelectOption({
    value: 'ndjson',
    label: createDatasetFlyoutStrings.settingsFormatNdjson(),
    description: createDatasetFlyoutStrings.settingsFormatNdjsonDescription(),
  }),
  buildSuperSelectOption({
    value: 'parquet',
    label: createDatasetFlyoutStrings.settingsFormatParquet(),
    description: createDatasetFlyoutStrings.settingsFormatParquetDescription(),
  }),
  buildSuperSelectOption({
    value: 'orc',
    label: createDatasetFlyoutStrings.settingsFormatOrc(),
    description: createDatasetFlyoutStrings.settingsFormatOrcDescription(),
  }),
];

export const PARTITION_DETECTION_SUPER_SELECT_OPTIONS = () => [
  {
    value: 'auto' as const,
    label: createDatasetFlyoutStrings.settingsPartitionDetectionAuto(),
    description: createDatasetFlyoutStrings.settingsPartitionDetectionAutoDescription(),
  },
  {
    value: 'hive' as const,
    label: createDatasetFlyoutStrings.settingsPartitionDetectionHive(),
    description: createDatasetFlyoutStrings.settingsPartitionDetectionHiveDescription(),
  },
  {
    value: 'none' as const,
    label: createDatasetFlyoutStrings.settingsPartitionDetectionNone(),
    description: createDatasetFlyoutStrings.settingsPartitionDetectionNoneDescription(),
  },
];

export const SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS = () => [
  {
    value: 'first_file_wins' as const,
    label: createDatasetFlyoutStrings.settingsSchemaResolutionFirstFileWins(),
    description: createDatasetFlyoutStrings.settingsSchemaResolutionFirstFileWinsDescription(),
  },
  {
    value: 'strict' as const,
    label: createDatasetFlyoutStrings.settingsSchemaResolutionStrict(),
    description: createDatasetFlyoutStrings.settingsSchemaResolutionStrictDescription(),
  },
  {
    value: 'union_by_name' as const,
    label: createDatasetFlyoutStrings.settingsSchemaResolutionUnionByName(),
    description: createDatasetFlyoutStrings.settingsSchemaResolutionUnionByNameDescription(),
  },
];

export const ERROR_MODE_SUPER_SELECT_OPTIONS = () => [
  {
    value: 'fail_fast' as const,
    label: createDatasetFlyoutStrings.settingsErrorModeFailFast(),
    description: createDatasetFlyoutStrings.settingsErrorModeFailFastDescription(),
  },
  {
    value: 'skip_row' as const,
    label: createDatasetFlyoutStrings.settingsErrorModeSkipRow(),
    description: createDatasetFlyoutStrings.settingsErrorModeSkipRowDescription(),
  },
  {
    value: 'null_field' as const,
    label: createDatasetFlyoutStrings.settingsErrorModeNullField(),
    description: createDatasetFlyoutStrings.settingsErrorModeNullFieldDescription(),
  },
];

export const MODE_SUPER_SELECT_OPTIONS = () => [
  {
    value: 'quoted' as const,
    label: createDatasetFlyoutStrings.settingsModeQuoted(),
    description: createDatasetFlyoutStrings.settingsModeQuotedDescription(),
  },
  {
    value: 'escaped' as const,
    label: createDatasetFlyoutStrings.settingsModeEscaped(),
    description: createDatasetFlyoutStrings.settingsModeEscapedDescription(),
  },
  {
    value: 'plain' as const,
    label: createDatasetFlyoutStrings.settingsModePlain(),
    description: createDatasetFlyoutStrings.settingsModePlainDescription(),
  },
];

export const HEADER_ROW_SUPER_SELECT_OPTIONS = () => [
  { value: 'true' as const, label: createDatasetFlyoutStrings.settingsHeaderRowTrue() },
  { value: 'false' as const, label: createDatasetFlyoutStrings.settingsHeaderRowFalse() },
];

export const HIVE_PARTITIONING_SUPER_SELECT_OPTIONS = () => [
  { value: 'true' as const, label: createDatasetFlyoutStrings.settingsHivePartitioningEnabled() },
  { value: 'false' as const, label: createDatasetFlyoutStrings.settingsHivePartitioningDisabled() },
];

export const MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS = () => [
  { value: 'none' as const, label: createDatasetFlyoutStrings.settingsMultiValueSyntaxNone() },
  {
    value: 'brackets' as const,
    label: createDatasetFlyoutStrings.settingsMultiValueSyntaxBrackets(),
  },
];

export const OPTIMIZED_READER_SUPER_SELECT_OPTIONS = () => [
  { value: 'true' as const, label: createDatasetFlyoutStrings.settingsHivePartitioningEnabled() },
  { value: 'false' as const, label: createDatasetFlyoutStrings.settingsHivePartitioningDisabled() },
];

export const DELIMITER_PRESETS = () => [
  { value: ',', label: createDatasetFlyoutStrings.settingsDelimiterLabel() + ' (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
];

export const ENCODING_PRESETS = () => [
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'ISO-8859-1', label: 'ISO-8859-1' },
  { value: 'UTF-16', label: 'UTF-16' },
];

export const NULL_VALUE_PRESETS = () => [
  { value: 'NULL', label: 'NULL' },
  { value: 'NA', label: 'NA' },
  { value: '', label: '(empty string)' },
];

export const PARTITION_PATH_PRESETS = () => [
  { value: '{year}/{month}/{day}', label: '{year}/{month}/{day}' },
  { value: 'year={year}/month={month}/day={day}', label: 'year={year}/month={month}/day={day}' },
];
