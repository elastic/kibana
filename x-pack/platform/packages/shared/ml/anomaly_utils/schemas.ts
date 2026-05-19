/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from './anomaly_utils';

const mlEntityFieldTypeSchema = z.union([
  z.literal(ML_ENTITY_FIELD_TYPE.BY),
  z.literal(ML_ENTITY_FIELD_TYPE.OVER),
  z.literal(ML_ENTITY_FIELD_TYPE.PARTITION),
]);

const mlEntityFieldOperationSchema = z.union([
  z.literal(ML_ENTITY_FIELD_OPERATIONS.ADD),
  z.literal(ML_ENTITY_FIELD_OPERATIONS.REMOVE),
]);

export const influencerSchema = z
  .object({
    fieldName: z.string(),
    fieldValue: z.any().optional(),
  })
  .strict();

export const criteriaFieldSchema = z
  .object({
    fieldName: z.string(),
    fieldValue: z.any().optional(),
    fieldType: mlEntityFieldTypeSchema.optional(),
  })
  .strict();

export const mlEntityFieldValueSchema = z.union([z.string(), z.number()]);

export const mlEntityFieldSchema = z
  .object({
    fieldName: z.string(),
    fieldValue: mlEntityFieldValueSchema.optional(),
    fieldType: mlEntityFieldTypeSchema.optional(),
    operation: mlEntityFieldOperationSchema.optional(),
    cardinality: z.number().optional(),
  })
  .strict();
