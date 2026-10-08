/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { baseFeatureSchema, featureSchema, upsertStreamQueryRequestSchema } from '..';

describe('lazy significant-events schemas', () => {
  it('preserves Zod object introspection through the lazy proxy', () => {
    expect(baseFeatureSchema).toBeInstanceOf(z.ZodObject);
    expect(featureSchema).toBeInstanceOf(z.ZodType);
    expect(upsertStreamQueryRequestSchema).toBeInstanceOf(z.ZodObject);
  });

  it('supports derived schemas without changing validation behavior', () => {
    const queryInputSchema = upsertStreamQueryRequestSchema.extend({
      stream_name: z.string(),
    });

    expect(
      queryInputSchema.safeParse({
        stream_name: 'logs.test',
        title: 'Example query',
        esql: { query: 'FROM logs.test | LIMIT 1' },
      }).success
    ).toBe(true);
  });
});
