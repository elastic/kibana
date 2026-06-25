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

describe('dataset_flyout_initial_values', () => {
  it('creates empty flyout form values', () => {
    expect(emptyDatasetFlyoutFormValues()).toEqual({
      name: '',
      description: '',
      data_source: '',
      resource: '',
      settings: { error_mode: '', partition_detection: '', schema_sample_size: '' },
    });
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

    expect(dataSetToFlyoutFormValues(data)).toEqual({
      name: 'id',
      description: '',
      data_source: 'source',
      resource: 'r',
      settings: {
        error_mode: 'skip_row',
        partition_detection: '',
        schema_sample_size: '',
      },
    });
  });
});
