/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
  omitDatasetSettingsNotSentToEs,
  validatePartitionPath,
  validateSchemaSampleSize,
} from './create_dataset_flyout_form_state';
import { NULL_VALUE_EMPTY_STRING_PRESET } from './dataset_settings_options';

const empty = () => emptyCreateDatasetSettingsFormValues();

describe('create_dataset_flyout_form_state', () => {
  describe('emptyCreateDatasetSettingsFormValues', () => {
    it('returns empty-string defaults for all fields', () => {
      expect(empty()).toEqual({
        format: '',
        partition_detection: '',
        schema_resolution: '',
        partition_path: '',
        schema_sample_size: '',
        delimiter: '',
        mode: '',
        header_row: '',
        null_value: '',
        encoding: '',
        error_mode: '',
        max_errors: '',
        max_error_ratio: '',
        quote: '',
        escape: '',
        comment: '',
        column_prefix: '',
        datetime_format: '',
        multi_value_syntax: '',
        max_field_size: '',
        segment_size: '',
        optimized_reader: '',
        late_materialization: '',
      });
    });
  });

  describe('buildDatasetSettingsFromFormValues', () => {
    it('returns undefined when all fields are unset', () => {
      expect(buildDatasetSettingsFromFormValues(empty())).toBeUndefined();
    });

    it('omits empty-string fields and returns only set fields', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), partition_detection: 'hive' })
      ).toEqual({ partition_detection: 'hive' });
    });

    it('maps schema_resolution under any format', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), schema_resolution: 'union_by_name' })
      ).toEqual({ schema_resolution: 'union_by_name' });
    });

    it('maps partition_path when partition detection is template', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          partition_detection: 'template',
          partition_path: '/year={year}/',
        })
      ).toEqual({ partition_detection: 'template', partition_path: '/year={year}/' });
    });

    it('omits partition_path when partition detection is not template', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          partition_detection: 'auto',
          partition_path: '/year={year}/',
        })
      ).toEqual({ partition_detection: 'auto' });
    });

    it('ignores format-specific fields when no format is selected', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), error_mode: 'skip_row' })
      ).toBeUndefined();
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), delimiter: ',', schema_sample_size: '10' })
      ).toBeUndefined();
    });

    it('includes schema_sample_size when set to a positive integer (csv)', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', schema_sample_size: '10' })
      ).toEqual({ format: 'csv', schema_sample_size: 10 });
    });

    it('includes schema_sample_size when set to a positive integer (ndjson)', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'ndjson',
          schema_sample_size: '10',
        })
      ).toEqual({ format: 'ndjson', schema_sample_size: 10 });
    });

    it('includes datetime_format for ndjson', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'ndjson',
          datetime_format: 'yyyy-MM-dd',
        })
      ).toEqual({ format: 'ndjson', datetime_format: 'yyyy-MM-dd' });
    });

    it('converts header_row boolean form values correctly', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: 'true' })
      ).toEqual({ format: 'csv', header_row: true });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: 'false' })
      ).toEqual({ format: 'csv', header_row: false });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', header_row: '' })
      ).toEqual({ format: 'csv' });
    });

    it('includes max_errors of 0 (valid non-negative)', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_errors: '0' })
      ).toEqual({ format: 'csv', max_errors: 0 });
    });

    it('includes max_error_ratio as a float', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', max_error_ratio: '0.5' })
      ).toEqual({ format: 'csv', max_error_ratio: 0.5 });
    });

    it('omits max error fields when error mode is fail_fast', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          error_mode: 'fail_fast',
          max_errors: '5',
          max_error_ratio: '0.5',
        })
      ).toEqual({ format: 'csv', error_mode: 'fail_fast' });
    });

    it('maps empty string null_value preset to an empty API value', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          null_value: NULL_VALUE_EMPTY_STRING_PRESET,
        })
      ).toEqual({ format: 'csv', null_value: '' });
    });

    it('includes format and CSV fields together', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          delimiter: ',',
          header_row: 'true',
        })
      ).toEqual({ format: 'csv', delimiter: ',', header_row: true });
    });

    it('includes ndjson error handling settings when format is ndjson', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'ndjson',
        error_mode: 'skip_row',
        max_errors: '5',
        schema_sample_size: '100',
      });
      expect(result).toEqual({
        format: 'ndjson',
        error_mode: 'skip_row',
        max_errors: 5,
        schema_sample_size: 100,
      });
    });

    it('includes orc error handling settings when format is orc', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'orc',
        error_mode: 'null_field',
        max_error_ratio: '0.1',
      });
      expect(result).toEqual({
        format: 'orc',
        error_mode: 'null_field',
        max_error_ratio: 0.1,
      });
    });

    it('includes parquet error handling settings when format is parquet', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'parquet',
        delimiter: ',',
        mode: 'quoted',
        header_row: 'true',
        encoding: 'UTF-8',
        error_mode: 'skip_row',
        max_errors: '5',
        schema_sample_size: '100',
      });
      expect(result).toEqual({
        format: 'parquet',
        error_mode: 'skip_row',
        max_errors: 5,
      });
    });

    it('omits parquet UI settings Elasticsearch does not accept', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'parquet',
          optimized_reader: 'true',
          late_materialization: 'true',
        })
      ).toEqual({ format: 'parquet' });
    });

    it('excludes CSV-only fields when format is parquet', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'parquet',
        delimiter: ',',
        mode: 'quoted',
        header_row: 'true',
        encoding: 'UTF-8',
        schema_sample_size: '100',
      });
      expect(result).toEqual({ format: 'parquet' });
    });

    it('excludes CSV-only fields when format is ndjson', () => {
      const result = buildDatasetSettingsFromFormValues({
        ...empty(),
        format: 'ndjson',
        delimiter: ',',
        mode: 'quoted',
        schema_sample_size: '50',
      });
      expect(result).toEqual({ format: 'ndjson', schema_sample_size: 50 });
    });
  });

  describe('omitDatasetSettingsNotSentToEs', () => {
    it('drops optimized_reader and late_materialization', () => {
      expect(
        omitDatasetSettingsNotSentToEs({
          format: 'parquet',
          optimized_reader: true,
          late_materialization: true,
        })
      ).toEqual({ format: 'parquet' });
    });
  });

  describe('validatePartitionPath', () => {
    it('requires a path when partition detection is template', () => {
      expect(validatePartitionPath('', 'template')).toEqual(expect.any(String));
      expect(validatePartitionPath('  ', 'template')).toEqual(expect.any(String));
      expect(validatePartitionPath('{year}/{month}', 'template')).toBe(true);
    });

    it('rejects a path when partition detection is not template', () => {
      expect(validatePartitionPath('{year}/{month}', 'auto')).toEqual(expect.any(String));
      expect(validatePartitionPath('{year}/{month}', 'hive')).toEqual(expect.any(String));
      expect(validatePartitionPath('{year}/{month}', 'none')).toEqual(expect.any(String));
    });

    it('accepts an empty path for the other detection modes', () => {
      expect(validatePartitionPath('', '')).toBe(true);
      expect(validatePartitionPath('', 'auto')).toBe(true);
      expect(validatePartitionPath('', 'hive')).toBe(true);
      expect(validatePartitionPath('', 'none')).toBe(true);
    });
  });

  describe('validateSchemaSampleSize', () => {
    it('accepts an empty value', () => {
      expect(validateSchemaSampleSize('')).toBe(true);
      expect(validateSchemaSampleSize('  ')).toBe(true);
    });

    it('accepts integers in the Elasticsearch range', () => {
      expect(validateSchemaSampleSize('1')).toBe(true);
      expect(validateSchemaSampleSize('20000')).toBe(true);
    });

    it('rejects values above 20000', () => {
      expect(validateSchemaSampleSize('20001')).toEqual(expect.any(String));
      expect(validateSchemaSampleSize('100000')).toEqual(expect.any(String));
    });

    it('rejects non-integers and values below 1', () => {
      expect(validateSchemaSampleSize('0')).toEqual(expect.any(String));
      expect(validateSchemaSampleSize('1.5')).toEqual(expect.any(String));
    });
  });
});
