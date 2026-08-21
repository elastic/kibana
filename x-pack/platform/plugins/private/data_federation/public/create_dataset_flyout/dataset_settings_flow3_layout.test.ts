/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildFlow3SettingsCustomJsonExample,
  getFlow3AdvancedFields,
  getFlow3CommonFields,
  getFlow3JsonExampleFieldIds,
  getFlow3ListAdvancedFields,
} from './dataset_settings_flow3_layout';

describe('dataset_settings_flow3_layout', () => {
  describe('getFlow3CommonFields', () => {
    it('returns csv common fields without error limit fields', () => {
      expect(getFlow3CommonFields('csv', 'skip_row')).toEqual([
        'delimiter',
        'mode',
        'header_row',
        'datetime_format',
        'encoding',
      ]);
    });

    it('includes conditional error limit fields for ndjson when not fail_fast', () => {
      expect(getFlow3CommonFields('ndjson', 'skip_row')).toEqual([
        'datetime_format',
        'error_mode',
        'schema_sample_size',
        'max_errors',
        'max_error_ratio',
      ]);
    });

    it('excludes conditional error limit fields for ndjson when fail_fast', () => {
      expect(getFlow3CommonFields('ndjson', 'fail_fast')).toEqual([
        'datetime_format',
        'error_mode',
        'schema_sample_size',
      ]);
    });
  });

  describe('getFlow3AdvancedFields', () => {
    it('excludes common csv fields and keeps remaining fields in accordion order', () => {
      expect(getFlow3AdvancedFields('csv', 'fail_fast')).toEqual([
        'partition_detection',
        'partition_path',
        'schema_sample_size',
        'schema_resolution',
        'hive_partitioning',
        'quote',
        'escape',
        'comment',
        'column_prefix',
        'null_value',
        'multi_value_syntax',
        'error_mode',
        'max_field_size',
      ]);
    });

    it('moves error limit fields out of advanced for parquet when promoted to common', () => {
      expect(getFlow3AdvancedFields('parquet', 'skip_row')).toEqual([
        'partition_path',
        'hive_partitioning',
        'optimized_reader',
        'late_materialization',
      ]);
    });

    it('keeps error limit fields in advanced for csv when error mode is not fail_fast', () => {
      expect(getFlow3AdvancedFields('csv', 'skip_row')).toEqual([
        'partition_detection',
        'partition_path',
        'schema_sample_size',
        'schema_resolution',
        'hive_partitioning',
        'quote',
        'escape',
        'comment',
        'column_prefix',
        'null_value',
        'multi_value_syntax',
        'error_mode',
        'max_errors',
        'max_error_ratio',
        'max_field_size',
      ]);
    });
  });

  describe('flow 3 list and json example layout', () => {
    it('returns trimmed advanced fields for csv', () => {
      expect(getFlow3ListAdvancedFields('csv', 'fail_fast')).toEqual([
        'partition_path',
        'error_mode',
        'null_value',
      ]);
    });

    it('returns trimmed advanced fields for ndjson', () => {
      expect(getFlow3ListAdvancedFields('ndjson', 'fail_fast')).toEqual([
        'partition_path',
        'segment_size',
      ]);
    });

    it('builds commented json examples for removed csv fields', () => {
      expect(buildFlow3SettingsCustomJsonExample('csv', 'fail_fast')).toContain(
        '// "quote": "\\""'
      );
      expect(getFlow3JsonExampleFieldIds('csv', 'fail_fast')).toContain('quote');
      expect(getFlow3JsonExampleFieldIds('csv', 'fail_fast')).not.toContain('null_value');
    });
  });
});
