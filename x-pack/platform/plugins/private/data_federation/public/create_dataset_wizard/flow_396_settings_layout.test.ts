/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getActiveFlow396AdvancedFields,
  getActiveFlow396CommonFields,
} from './flow_396_settings_layout';

describe('flow 3 9.6 settings layout', () => {
  it('puts csv and tsv fields in common, then shared and format advanced fields', () => {
    expect(getActiveFlow396CommonFields('csv')).toEqual([
      'delimiter',
      'mode',
      'header_row',
      'skip_rows',
      'datetime_format',
      'null_value',
      'encoding',
    ]);
    expect(getActiveFlow396CommonFields('tsv')).toEqual(getActiveFlow396CommonFields('csv'));
    expect(getActiveFlow396AdvancedFields('csv', 'fail_fast')).toEqual([
      'error_mode',
      'file_exclusions',
      'partition_detection',
      'partition_path',
      'quote',
      'escape',
      'column_prefix',
      'trim_spaces',
    ]);
  });

  it('shows max error fields in advanced only when error mode is not fail_fast', () => {
    expect(getActiveFlow396AdvancedFields('ndjson', 'skip_row')).toEqual([
      'error_mode',
      'max_errors',
      'max_error_ratio',
      'file_exclusions',
      'partition_detection',
      'partition_path',
    ]);
  });

  it('keeps ndjson common to datetime format and parquet common empty', () => {
    expect(getActiveFlow396CommonFields('ndjson')).toEqual(['datetime_format']);
    expect(getActiveFlow396CommonFields('parquet')).toEqual([]);
    expect(getActiveFlow396AdvancedFields('parquet')).not.toEqual(
      expect.arrayContaining(['optimized_reader', 'late_materialization', 'segment_size'])
    );
  });
});
