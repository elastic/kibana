/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestPartitionsSchema } from './suggest_partitions_route';

describe('suggestPartitionsSchema', () => {
  it('validates correct request parameters', () => {
    const validParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        start: 1704067200000,
        end: 1704153600000,
      },
    };

    const result = suggestPartitionsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it('rejects missing stream name', () => {
    const invalidParams = {
      path: {},
      body: {
        connector_id: 'test-connector',
        start: 1704067200000,
        end: 1704153600000,
      },
    };

    const result = suggestPartitionsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects missing connector_id', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        start: 1704067200000,
        end: 1704153600000,
      },
    };

    const result = suggestPartitionsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects missing time range', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
      },
    };

    const result = suggestPartitionsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('rejects invalid start/end types', () => {
    const invalidParams = {
      path: { name: 'logs.test' },
      body: {
        connector_id: 'test-connector',
        start: 'invalid',
        end: 'invalid',
      },
    };

    const result = suggestPartitionsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });
});
