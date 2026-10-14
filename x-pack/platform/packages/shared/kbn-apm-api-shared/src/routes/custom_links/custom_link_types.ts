/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import {
  MAX_ARRAY_ITEMS,
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
} from '../../constants';

export const filterOptionsSchema = z
  .object({
    'service.name': z.string().max(MAX_FIELD_VALUE_LENGTH),
    'service.environment': z.string().max(MAX_FIELD_VALUE_LENGTH),
    'transaction.name': z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
    'transaction.type': z.string().max(MAX_FIELD_VALUE_LENGTH),
  })
  .partial();

const filterKeySchema = z.union([
  z.literal(''),
  z.enum(['service.name', 'service.environment', 'transaction.name', 'transaction.type']),
]);

export const payloadSchema = z
  .object({
    label: z.string().max(MAX_FIELD_VALUE_LENGTH),
    url: z.string().max(2048),
  })
  .merge(
    z
      .object({
        id: z.string().max(MAX_FIELD_VALUE_LENGTH),
        filters: z
          .array(
            z.object({
              key: filterKeySchema,
              value: z.string().max(MAX_FIELD_VALUE_LENGTH),
            })
          )
          .max(MAX_ARRAY_ITEMS),
      })
      .partial()
  );
