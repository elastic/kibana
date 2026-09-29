/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from './anomaly_utils';

// Persisted embeddable / saved-object state historically accepted entity values
// up to 10,000 characters (long URLs, user-agents). Keep that bound so existing
// single-metric-viewer panels continue to validate after upgrade.
const MAX_ENTITY_FIELD_NAME_LENGTH = 10000;
const MAX_ENTITY_FIELD_VALUE_LENGTH = 10000;

const mlEntityFieldTypeSchema = z.enum(ML_ENTITY_FIELD_TYPE);

const mlEntityFieldOperationSchema = z.enum(ML_ENTITY_FIELD_OPERATIONS);

export const influencerSchema = z
  .object({
    fieldName: z.string().max(MAX_ENTITY_FIELD_NAME_LENGTH),
    fieldValue: z.any(),
  })
  .strict();

export const criteriaFieldSchema = z
  .object({
    fieldName: z.string().max(MAX_ENTITY_FIELD_NAME_LENGTH),
    fieldValue: z.any(),
    fieldType: mlEntityFieldTypeSchema.optional(),
  })
  .strict();

export const mlEntityFieldValueSchema = z.union([
  z.string().max(MAX_ENTITY_FIELD_VALUE_LENGTH),
  z.number(),
]);

export const mlEntityFieldSchema = z
  .object({
    fieldName: z.string().max(MAX_ENTITY_FIELD_NAME_LENGTH),
    fieldValue: mlEntityFieldValueSchema.optional(),
    fieldType: mlEntityFieldTypeSchema.optional(),
    operation: mlEntityFieldOperationSchema.optional(),
    cardinality: z.number().optional(),
  })
  .strict();
