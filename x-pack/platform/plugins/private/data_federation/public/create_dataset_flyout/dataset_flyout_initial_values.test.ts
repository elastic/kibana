/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../../common/dataset_types';
import {
  dataSetFromListItem,
  dataSetToFlyoutFormValues,
  emptyDatasetFlyoutFormValues,
} from './dataset_flyout_initial_values';
import { NULL_VALUE_EMPTY_STRING_PRESET } from './dataset_settings_options';

describe('dataset_flyout_initial_values', () => {
  it('creates empty flyout form values', () => {
    const values = emptyDatasetFlyoutFormValues();
    expect(values.name).toBe('');
    expect(values.description).toBe('');
    expect(values.data_source).toBe('');
    expect(values.resource).toBe('');
    expect(values.settings.format).toBe('');
    expect(values.settings.error_mode).toBe('');
    expect(values.settings.partition_detection).toBe('');
    expect(values.settings.schema_resolution).toBe('');
    expect(values.settings.partition_path).toBe('');
    expect(values.settings.schema_sample_size).toBe('');
    expect(values.settings.delimiter).toBe('');
    expect(values.settings.header_row).toBe('');
  });

  it('maps list-table item and defaults description to empty string', () => {
    const item = { name: 'ds', data_source: 'source', resource: 'r' } as DataSetWithName;
    expect(dataSetFromListItem(item)).toEqual({ ...item, description: '' });
  });

  it('maps dataset to flyout values and defaults missing description/settings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: { error_mode: 'skip_row' },
    };

    const result = dataSetToFlyoutFormValues(data);
    expect(result.name).toBe('id');
    expect(result.description).toBe('');
    expect(result.data_source).toBe('source');
    expect(result.resource).toBe('r');
    expect(result.settings.error_mode).toBe('skip_row');
    expect(result.settings.partition_detection).toBe('');
    expect(result.settings.schema_sample_size).toBe('');
    expect(result.settings.format).toBe('');
  });

  it('maps boolean settings back to form values', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        header_row: false,
      },
    };

    const result = dataSetToFlyoutFormValues(data);
    expect(result.settings.header_row).toBe('false');
  });

  it('reads a legacy hive_partitioning toggle as a partition detection mode', () => {
    const base = { name: 'id', data_source: 'source', resource: 'r' };

    expect(
      dataSetToFlyoutFormValues({ ...base, settings: { hive_partitioning: true } }).settings
        .partition_detection
    ).toBe('hive');
    expect(
      dataSetToFlyoutFormValues({ ...base, settings: { hive_partitioning: false } }).settings
        .partition_detection
    ).toBe('none');
  });

  it('prefers a stored partition_detection over the legacy toggle', () => {
    const result = dataSetToFlyoutFormValues({
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: { partition_detection: 'auto', hive_partitioning: true },
    });

    expect(result.settings.partition_detection).toBe('auto');
  });

  it('maps numeric settings to strings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        schema_sample_size: 5000,
        max_errors: 10,
        max_error_ratio: 0.1,
        max_field_size: 0,
      },
    };

    const result = dataSetToFlyoutFormValues(data);
    expect(result.settings.schema_sample_size).toBe('5000');
    expect(result.settings.max_errors).toBe('10');
    expect(result.settings.max_error_ratio).toBe('0.1');
    expect(result.settings.max_field_size).toBe('0');
  });

  it('maps new universal settings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        schema_resolution: 'union_by_name',
        partition_detection: 'template',
        partition_path: '/year={year}/',
      },
    };

    const result = dataSetToFlyoutFormValues(data);
    expect(result.settings.schema_resolution).toBe('union_by_name');
    expect(result.settings.partition_detection).toBe('template');
    expect(result.settings.partition_path).toBe('/year={year}/');
  });

  it('maps API empty string null_value to the internal preset', () => {
    const result = dataSetToFlyoutFormValues({
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        null_value: '',
      },
    });

    expect(result.settings.null_value).toBe(NULL_VALUE_EMPTY_STRING_PRESET);
  });
});
