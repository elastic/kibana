/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataStreamSchemaV1, dataStreamSchemaV2 } from './data_stream_schema';

const attributes = {
  integration_id: 'integration',
  data_stream_id: 'data-stream',
  created_by: 'user',
  title: 'Data stream',
  description: 'Description',
  input_types: ['filestream'],
  job_info: {
    job_id: 'job',
    job_type: 'type',
    status: 'completed',
  },
  metadata: {},
  field_type_overrides: [{ name: 'field', type: 'long', original_type: 'keyword' }],
  result: {
    field_mapping: [{ name: 'field', type: 'keyword', is_ecs: false }],
  },
};

describe('data stream saved object schemas', () => {
  it('keeps create schemas strict across model versions', () => {
    expect(() => dataStreamSchemaV1.validate(attributes)).toThrow(/field_type_overrides/);
    expect(dataStreamSchemaV2.validate(attributes).field_type_overrides).toEqual(
      attributes.field_type_overrides
    );
  });

  it('strips the newer top-level field for older model versions', () => {
    const v1ForwardCompatibility = dataStreamSchemaV1.extends({}, { unknowns: 'ignore' });
    const v2ForwardCompatibility = dataStreamSchemaV2.extends({}, { unknowns: 'ignore' });

    expect(v1ForwardCompatibility.validate(attributes)).not.toHaveProperty('field_type_overrides');
    expect(v2ForwardCompatibility.validate(attributes).field_type_overrides).toEqual(
      attributes.field_type_overrides
    );
  });
});
