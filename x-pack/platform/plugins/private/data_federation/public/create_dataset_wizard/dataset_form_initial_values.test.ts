/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../../common/dataset_types';
import {
  dataSetFromListItem,
  dataSetToFormValues,
  emptyDatasetFormValues,
} from './dataset_form_initial_values';

describe('dataset_form_initial_values', () => {
  it('creates empty form values', () => {
    const values = emptyDatasetFormValues();
    expect(values.name).toBe('');
    expect(values.description).toBe('');
    expect(values.data_source).toBe('');
    expect(values.resource).toBe('');
    expect(values.ui).toEqual({
      formatWasAutoDetected: false,
      additionalCommonSettingsIsOpen: true,
      additionalAdvancedSettingsIsOpen: false,
      unmanagedSettings: {},
    });
    expect(values.settings.format).toBe('');
    expect(values.settings.error_mode).toBe('');
    expect(values.settings.partition_detection).toBe('');
    expect(values.settings.schema_resolution).toBe('');
    expect(values.settings.partition_path).toBe('');
    expect(values.settings.file_exclusions).toEqual([]);
    expect(values.settings.hive_partitioning).toBe('');
    expect(values.settings.delimiter).toBe('');
    expect(values.settings.header_row).toBe('');
    expect(values.settings.skip_rows).toBe('');
    expect(values.settings.encoding).toBe('');
    expect(values.settings.column_prefix).toBe('');
    expect(values.settings.trim_spaces).toBe(false);
  });

  it('maps list-table item and defaults description to empty string', () => {
    const item = { name: 'ds', data_source: 'source', resource: 'r' } as DataSetWithName;
    expect(dataSetFromListItem(item)).toEqual({ ...item, description: '' });
  });

  it('maps dataset to form values and defaults missing description/settings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: { error_mode: 'skip_row' },
    };

    const result = dataSetToFormValues(data);
    expect(result.name).toBe('id');
    expect(result.description).toBe('');
    expect(result.data_source).toBe('source');
    expect(result.resource).toBe('r');
    expect(result.settings.error_mode).toBe('skip_row');
    expect(result.settings.partition_detection).toBe('');
    expect(result.settings.format).toBe('');
  });

  it('maps boolean settings back to form values', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        header_row: false,
        hive_partitioning: true,
      },
    };

    const result = dataSetToFormValues(data);
    expect(result.settings.header_row).toBe('false');
    expect(result.settings.hive_partitioning).toBe('true');
  });

  it('maps numeric settings to strings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        max_errors: 10,
        max_error_ratio: 0.1,
        skip_rows: 12,
      },
    };

    const result = dataSetToFormValues(data);
    expect(result.settings.max_errors).toBe('10');
    expect(result.settings.max_error_ratio).toBe('0.1');
    expect(result.settings.skip_rows).toBe('12');
  });

  it('maps new universal settings', () => {
    const data: DataSetWithName = {
      name: 'id',
      data_source: 'source',
      resource: 'r',
      settings: {
        schema_resolution: 'union_by_name',
        partition_path: '/year={year}/',
        hive_partitioning: false,
        file_exclusions: ['**/tmp/**'],
      },
    };

    const result = dataSetToFormValues(data);
    expect(result.settings.schema_resolution).toBe('union_by_name');
    expect(result.settings.partition_path).toBe('/year={year}/');
    expect(result.settings.hive_partitioning).toBe('false');
    expect(result.settings.file_exclusions).toEqual(['**/tmp/**']);
  });
});
