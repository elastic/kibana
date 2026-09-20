/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDatasetSettingsFromFormValues,
  DEFAULT_FILE_EXCLUSIONS,
  emptyCreateDatasetSettingsFormValues,
} from './create_dataset_form_state';

const empty = () => emptyCreateDatasetSettingsFormValues();

describe('create_dataset_form_state', () => {
  describe('emptyCreateDatasetSettingsFormValues', () => {
    it('returns empty-string defaults for all fields', () => {
      expect(empty()).toEqual({
        format: '',
        file_exclusions: [...DEFAULT_FILE_EXCLUSIONS],
        partition_detection: '',
        schema_resolution: '',
        partition_path: '',
        hive_partitioning: '',
        optimized_reader: '',
        late_materialization: '',
        schema_sample_size: '',
        delimiter: '',
        mode: '',
        header_row: '',
        skip_rows: '',
        datetime_format: '',
        null_value: '',
        encoding: 'UTF-8',
        error_mode: '',
        max_errors: '',
        max_error_ratio: '',
        quote: '',
        escape: '',
        comment: '',
        column_prefix: '',
        multi_value_syntax: '',
        max_field_size: '',
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

    it('maps partition_path under any format', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), partition_path: '/year={year}/' })
      ).toEqual({ partition_path: '/year={year}/' });
    });

    it('omits default file_exclusions and includes custom values', () => {
      expect(buildDatasetSettingsFromFormValues(empty())).toBeUndefined();
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          file_exclusions: ['**/tmp/**'],
        })
      ).toEqual({ file_exclusions: ['**/tmp/**'] });
    });

    it('converts hive_partitioning boolean form values correctly', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), hive_partitioning: 'false' })
      ).toEqual({ hive_partitioning: false });
      expect(buildDatasetSettingsFromFormValues({ ...empty(), hive_partitioning: 'true' })).toEqual(
        { hive_partitioning: true }
      );
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), hive_partitioning: '' })
      ).toBeUndefined();
    });

    it('ignores format-specific fields when no format is selected', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), error_mode: 'skip_row' })).toEqual({
        error_mode: 'skip_row',
      });
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

    it('includes skip_rows for csv when in range', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '0' })
      ).toEqual({ format: 'csv', skip_rows: 0 });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '1000' })
      ).toEqual({ format: 'csv', skip_rows: 1000 });
    });

    it('omits skip_rows when out of range', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', skip_rows: '1001' })
      ).toEqual({ format: 'csv' });
    });

    it('omits default UTF-8 encoding and includes other encodings', () => {
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', encoding: 'UTF-8' })
      ).toEqual({ format: 'csv' });
      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), format: 'csv', encoding: 'UTF-16' })
      ).toEqual({ format: 'csv', encoding: 'UTF-16' });
    });

    it('omits default ISO-8601 datetime_format', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          format: 'csv',
          datetime_format: 'ISO-8601',
        })
      ).toEqual({ format: 'csv' });
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

    it('excludes CSV-only fields when format is parquet', () => {
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
      expect(result).toEqual({ format: 'parquet', error_mode: 'skip_row', max_errors: 5 });
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
});
