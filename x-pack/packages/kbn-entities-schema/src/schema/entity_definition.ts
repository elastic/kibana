/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import {
  arrayOfStringsSchema,
  entityTypeSchema,
  keyMetricSchema,
  metadataSchema,
  filterSchema,
  durationSchema,
  identityFieldsSchema,
} from './common';

export const entityDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  name: z.string(),
  description: z.optional(z.string()),
  type: entityTypeSchema,
  filter: filterSchema,
  indexPatterns: arrayOfStringsSchema,
  identityFields: z.array(identityFieldsSchema),
  identityTemplate: z.string(),
  metadata: z.optional(z.array(metadataSchema)),
  metrics: z.optional(z.array(keyMetricSchema)),
  staticFields: z.optional(z.record(z.string(), z.string())),
  lookback: durationSchema,
  timestampField: z.string(),
  managed: z.optional(z.boolean()).default(false),
  settings: z.optional(
    z.object({
      syncField: z.optional(z.string()),
      syncDelay: z.optional(z.string()),
      frequency: z.optional(z.string()),
    })
  ),
});

export type EntityDefinition = z.infer<typeof entityDefinitionSchema>;
