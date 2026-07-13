/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkOperationParamsSchema } from './bulk_operation_schema';

describe('bulkOperationParamsSchema', () => {
  it('accepts a valid ids payload', () => {
    const result = bulkOperationParamsSchema.parse({ ids: ['rule-1'] });

    expect(result).toEqual({ ids: ['rule-1'] });
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      bulkOperationParamsSchema.parse({
        ids: ['rule-1'],
        unknownField: 'x',
      })
    ).toThrow();
  });
});
