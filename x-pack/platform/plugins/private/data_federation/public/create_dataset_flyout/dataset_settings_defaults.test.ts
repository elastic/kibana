/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyCreateDatasetSettingsFormValues,
  type CreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';
import { applySettingsForFormat, getDefaultSettingsForFormat } from './dataset_settings_defaults';
import { NULL_VALUE_EMPTY_STRING_PRESET } from './dataset_settings_options';

describe('getDefaultSettingsForFormat', () => {
  it('returns orc defaults', () => {
    expect(getDefaultSettingsForFormat('orc')).toEqual({
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'true',
      error_mode: 'fail_fast',
      max_error_ratio: '0.0',
    });
  });
});

describe('applySettingsForFormat', () => {
  it('applies csv defaults to an empty form', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'csv',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'false',
      delimiter: ',',
      mode: 'quoted',
      header_row: 'true',
      comment: '//',
      quote: '"',
      escape: '\\',
      multi_value_syntax: 'none',
      error_mode: 'fail_fast',
      encoding: 'UTF-8',
      column_prefix: 'col',
      null_value: NULL_VALUE_EMPTY_STRING_PRESET,
      schema_sample_size: '20000',
      max_error_ratio: '0.0',
      max_field_size: '10485760',
      datetime_format: 'ISO-8601',
    });
  });

  it('applies tsv defaults to an empty form', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'tsv')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'tsv',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'false',
      delimiter: '\t',
      mode: 'plain',
      header_row: 'true',
      comment: '//',
      quote: '"',
      escape: '\\',
      multi_value_syntax: 'none',
      error_mode: 'fail_fast',
      encoding: 'UTF-8',
      column_prefix: 'col',
      null_value: NULL_VALUE_EMPTY_STRING_PRESET,
      schema_sample_size: '20000',
      max_error_ratio: '0.0',
      max_field_size: '10485760',
      datetime_format: 'ISO-8601',
    });
  });

  it('applies ndjson defaults', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'ndjson')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'ndjson',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'false',
      error_mode: 'fail_fast',
      max_error_ratio: '0.0',
      schema_sample_size: '20000',
      segment_size: '4mb',
      datetime_format: 'ISO-8601',
    });
  });

  it('applies parquet defaults', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'parquet',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'true',
      error_mode: 'fail_fast',
      max_error_ratio: '0.0',
      optimized_reader: 'true',
      late_materialization: 'true',
    });
  });

  it('applies orc defaults', () => {
    expect(applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'orc')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'orc',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'true',
      error_mode: 'fail_fast',
      max_error_ratio: '0.0',
    });
  });

  it('replaces csv defaults when switching to tsv', () => {
    const csvSettings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv');

    expect(applySettingsForFormat(csvSettings, 'tsv')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'tsv',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'false',
      delimiter: '\t',
      mode: 'plain',
      header_row: 'true',
      comment: '//',
      quote: '"',
      escape: '\\',
      multi_value_syntax: 'none',
      error_mode: 'fail_fast',
      encoding: 'UTF-8',
      column_prefix: 'col',
      null_value: NULL_VALUE_EMPTY_STRING_PRESET,
      schema_sample_size: '20000',
      max_error_ratio: '0.0',
      max_field_size: '10485760',
      datetime_format: 'ISO-8601',
    });
  });

  it('resets customized csv fields when switching to tsv', () => {
    const csvSettings: CreateDatasetSettingsFormValues = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      delimiter: '|',
      encoding: 'ISO-8859-1',
      mode: 'escaped',
    };

    expect(applySettingsForFormat(csvSettings, 'tsv')).toMatchObject({
      format: 'tsv',
      delimiter: '\t',
      mode: 'plain',
      encoding: 'UTF-8',
    });
  });

  it('clears csv-only fields when switching to parquet', () => {
    const csvSettings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv');

    expect(applySettingsForFormat(csvSettings, 'parquet')).toEqual({
      ...emptyCreateDatasetSettingsFormValues(),
      format: 'parquet',
      partition_detection: 'auto',
      schema_resolution: 'union_by_name',
      hive_partitioning: 'true',
      error_mode: 'fail_fast',
      max_error_ratio: '0.0',
      optimized_reader: 'true',
      late_materialization: 'true',
    });
  });

  it('preserves shared universal values when switching formats', () => {
    const csvSettings: CreateDatasetSettingsFormValues = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      partition_detection: 'hive',
      schema_resolution: 'strict',
    };

    expect(applySettingsForFormat(csvSettings, 'ndjson')).toMatchObject({
      format: 'ndjson',
      partition_detection: 'hive',
      schema_resolution: 'strict',
      schema_sample_size: '20000',
      delimiter: '',
      encoding: '',
    });
  });

  it('preserves user-entered shared fields without format defaults', () => {
    const csvSettings: CreateDatasetSettingsFormValues = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      partition_path: '{year}/{month}/{day}',
    };

    expect(applySettingsForFormat(csvSettings, 'ndjson')).toMatchObject({
      format: 'ndjson',
      partition_path: '{year}/{month}/{day}',
      schema_sample_size: '20000',
    });
  });

  it('replaces datetime_format when switching between csv and ndjson', () => {
    const csvSettings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv');

    expect(applySettingsForFormat(csvSettings, 'ndjson')).toMatchObject({
      format: 'ndjson',
      datetime_format: 'ISO-8601',
    });
  });
});
