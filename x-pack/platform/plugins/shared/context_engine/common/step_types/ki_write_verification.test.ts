/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKiInputSchema } from './create_ki';
import { updateKiInputSchema } from './update_ki';

const createInput = {
  ai_index_id: 'my-ai-index',
  ki: { type: 'detection', title: 'Failed login burst' },
};

const updateInput = {
  ai_index_id: 'my-ai-index',
  ki_id: 'ki-1',
  ki: { title: 'Updated title' },
};

describe.each([
  ['createKi', createKiInputSchema, createInput],
  ['updateKi', updateKiInputSchema, updateInput],
])('%s verification input', (_name, schema, input) => {
  it('preserves the existing input when verification is omitted', () => {
    expect(schema.safeParse(input).success).toBe(true);
  });

  it('accepts an explicit verifier list and custom ES|QL attributes', () => {
    expect(
      schema.safeParse({
        ...input,
        verification: {
          verifiers: ['esql-valid-syntax'],
          esql_attributes: ['aggregation_query'],
        },
      }).success
    ).toBe(true);
  });

  it('rejects verification without a verifier', () => {
    expect(schema.safeParse({ ...input, verification: {} }).success).toBe(false);
    expect(schema.safeParse({ ...input, verification: { verifiers: [] } }).success).toBe(false);
  });
});
