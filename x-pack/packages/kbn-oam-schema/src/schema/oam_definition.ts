/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import {
  arrayOfStringsSchema,
  assetTypeSchema,
  keyMetricSchema,
  metadataSchema,
  filterSchema,
  durationSchema,
} from './common';

export const oamDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  name: z.string(),
  description: z.optional(z.string()),
  type: assetTypeSchema,
  filter: filterSchema,
  indexPatterns: arrayOfStringsSchema,
  identityFields: arrayOfStringsSchema,
  identityTemplate: z.string(),
  categories: arrayOfStringsSchema,
  metadata: z.optional(z.array(metadataSchema)),
  metrics: z.optional(z.array(keyMetricSchema)),
  staticFields: z.optional(z.record(z.string(), z.string())),
  lookback: durationSchema,
  timestampField: z.string(),
  settings: z.optional(
    z.object({
      syncField: z.optional(z.string()),
      syncDelay: z.optional(z.string()),
      frequency: z.optional(z.string()),
    })
  ),
});

export type OAMDefinition = z.infer<typeof oamDefinitionSchema>;
