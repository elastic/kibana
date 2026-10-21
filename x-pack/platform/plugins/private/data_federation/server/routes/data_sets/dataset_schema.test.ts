/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { datasetSchema } from './dataset_schema';

const baseDataset = {
  data_source: 'my_source',
  resource: 's3://bucket/path/*.csv',
};

describe('datasetSchema', () => {
  it('validates the settings that Kibana defines', () => {
    expect(() => datasetSchema.validate({ ...baseDataset, settings: { format: 'xml' } })).toThrow();
    expect(() =>
      datasetSchema.validate({ ...baseDataset, settings: { delimiter: 'abc' } })
    ).toThrow();
    expect(() =>
      datasetSchema.validate({ ...baseDataset, settings: { max_field_size: 1.5 } })
    ).toThrow();
  });

  it('keeps settings that Kibana does not define', () => {
    const settings = {
      format: 'csv',
      delimiter: ',',
      future_setting: 'some value',
      nested_future_setting: { enabled: true },
    };

    expect(datasetSchema.validate({ ...baseDataset, settings })).toEqual({
      ...baseDataset,
      settings,
    });
  });
});
