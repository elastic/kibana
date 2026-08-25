/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from './anomaly_utils';

const mlEntityFieldTypeSchema = lazySchema(() => z.enum(ML_ENTITY_FIELD_TYPE));

const mlEntityFieldOperationSchema = lazySchema(() => z.enum(ML_ENTITY_FIELD_OPERATIONS));

export const influencerSchema = lazySchema(() =>
  z
    .object({
      fieldName: z.string().max(10000),
      fieldValue: z.any(),
    })
    .strict()
);

export const criteriaFieldSchema = lazySchema(() =>
  z
    .object({
      fieldName: z.string().max(10000),
      fieldValue: z.any(),
      fieldType: mlEntityFieldTypeSchema.optional(),
    })
    .strict()
);

export const mlEntityFieldValueSchema = lazySchema(() =>
  z.union([z.string().max(10000), z.number()])
);

export const mlEntityFieldSchema = lazySchema(() =>
  z
    .object({
      fieldName: z.string().max(10000),
      fieldValue: mlEntityFieldValueSchema.optional(),
      fieldType: mlEntityFieldTypeSchema.optional(),
      operation: mlEntityFieldOperationSchema.optional(),
      cardinality: z.number().optional(),
    })
    .strict()
);
