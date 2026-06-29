/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDatasetSettingsFromFormValues,
  emptyCreateDatasetSettingsFormValues,
} from './create_dataset_flyout_form_state';

const empty = () => emptyCreateDatasetSettingsFormValues();

describe('create_dataset_flyout_form_state', () => {
  describe('emptyCreateDatasetSettingsFormValues', () => {
    it('returns empty-string defaults for all fields', () => {
      expect(empty()).toEqual({
        format: '',
        partition_detection: '',
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
      expect(buildDatasetSettingsFromFormValues({ ...empty(), error_mode: 'skip_row' })).toEqual({
        error_mode: 'skip_row',
      });

      expect(
        buildDatasetSettingsFromFormValues({ ...empty(), partition_detection: 'hive' })
      ).toEqual({ partition_detection: 'hive' });
    });

    it('includes schema_sample_size when set to a positive integer', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), schema_sample_size: '10' })).toEqual({
        schema_sample_size: 10,
      });
    });

    it('converts header_row boolean form values correctly', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), header_row: 'true' })).toEqual({
        header_row: true,
      });
      expect(buildDatasetSettingsFromFormValues({ ...empty(), header_row: 'false' })).toEqual({
        header_row: false,
      });
      expect(buildDatasetSettingsFromFormValues({ ...empty(), header_row: '' })).toBeUndefined();
    });

    it('converts optimized_reader and late_materialization boolean form values correctly', () => {
      expect(
        buildDatasetSettingsFromFormValues({
          ...empty(),
          optimized_reader: 'false',
          late_materialization: 'true',
        })
      ).toEqual({ optimized_reader: false, late_materialization: true });
    });

    it('includes max_errors of 0 (valid non-negative)', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), max_errors: '0' })).toEqual({
        max_errors: 0,
      });
    });

    it('includes max_error_ratio as a float', () => {
      expect(buildDatasetSettingsFromFormValues({ ...empty(), max_error_ratio: '0.5' })).toEqual({
        max_error_ratio: 0.5,
      });
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
  });
});
