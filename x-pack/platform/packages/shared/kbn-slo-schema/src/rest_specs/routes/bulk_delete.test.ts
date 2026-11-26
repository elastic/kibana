/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KEYWORD_LENGTH } from '../../schema/limits';
import { bulkDeleteStatusParamsSchema } from './bulk_delete';

describe('bulkDeleteStatusParamsSchema', () => {
  it('accepts a UUID task id', () => {
    const result = bulkDeleteStatusParamsSchema.safeParse({
      path: { taskId: '3f2b8c1e-5a6d-4e7f-9b0a-1c2d3e4f5a6b' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a task id of exactly the maximum length', () => {
    const result = bulkDeleteStatusParamsSchema.safeParse({
      path: { taskId: 'a'.repeat(MAX_KEYWORD_LENGTH) },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a task id longer than the maximum length', () => {
    const result = bulkDeleteStatusParamsSchema.safeParse({
      path: { taskId: 'a'.repeat(MAX_KEYWORD_LENGTH + 1) },
    });

    expect(result.success).toBe(false);
  });
});
