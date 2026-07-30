/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from './anomaly_utils';

const mlEntityFieldTypeSchema = z.enum(ML_ENTITY_FIELD_TYPE);

const mlEntityFieldOperationSchema = z.enum(ML_ENTITY_FIELD_OPERATIONS);

export const influencerSchema = z
  .object({
    fieldName: z.string().max(10000),
    fieldValue: z.any(),
  })
  .strict();

export const criteriaFieldSchema = z
  .object({
    fieldName: z.string().max(10000),
    fieldValue: z.any(),
    fieldType: mlEntityFieldTypeSchema.optional(),
  })
  .strict();

export const mlEntityFieldValueSchema = z.union([z.string().max(10000), z.number()]);

export const mlEntityFieldSchema = z
  .object({
    fieldName: z.string().max(10000),
    fieldValue: mlEntityFieldValueSchema.optional(),
    fieldType: mlEntityFieldTypeSchema.optional(),
    operation: mlEntityFieldOperationSchema.optional(),
    cardinality: z.number().optional(),
  })
  .strict();
