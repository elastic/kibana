/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export const filterOptionsSchema = z
  .object({
    'service.name': z.string().max(1024),
    'service.environment': z.string().max(1024),
    'transaction.name': z.string().max(1024),
    'transaction.type': z.string().max(1024),
  })
  .partial();

const filterKeySchema = z.union([
  z.literal(''),
  z.enum(['service.name', 'service.environment', 'transaction.name', 'transaction.type']),
]);

export const payloadSchema = z
  .object({
    label: z.string().max(1024),
    url: z.string().max(2048),
  })
  .merge(
    z
      .object({
        id: z.string().max(1024),
        filters: z.array(
          z.object({
            key: filterKeySchema,
            value: z.string().max(1024),
          })
        ),
      })
      .partial()
  );
