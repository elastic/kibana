/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../common';
import { buildDatasetRequest, buildDatasetRequestBody } from './dataset_request';

describe('buildDatasetRequestBody', () => {
  it('drops the name and the empty settings fields', () => {
    const dataSet: DataSetWithName = {
      name: 'logs',
      data_source: 'source-1',
      resource: 'bucket/*',
      description: 'a description',
      settings: { format: 'csv', delimiter: '   ', error_mode: undefined },
    };

    expect(buildDatasetRequestBody(dataSet)).toEqual({
      data_source: 'source-1',
      resource: 'bucket/*',
      description: 'a description',
      settings: { format: 'csv' },
    });
  });

  it('keeps an empty description but omits an absent one', () => {
    const base: DataSetWithName = { name: 'logs', data_source: 'source-1', resource: 'bucket/*' };

    expect(buildDatasetRequestBody({ ...base, description: '' })).toHaveProperty('description', '');
    expect(buildDatasetRequestBody(base)).not.toHaveProperty('description');
  });
});

describe('buildDatasetRequest', () => {
  it('targets the by-id route with the trimmed name', () => {
    expect(
      buildDatasetRequest({ name: '  logs  ', data_source: 'source-1', resource: 'bucket/*' })
    ).toEqual({
      method: 'PUT',
      path: '/internal/data_federation/dataset/logs',
      body: { data_source: 'source-1', resource: 'bucket/*' },
    });
  });
});
