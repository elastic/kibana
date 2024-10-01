/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  arrayOfStringsSchema,
  keyMetricSchema,
  metadataSchema,
  filterSchema,
  durationSchema,
  identityFieldsSchema,
  semVerSchema,
  historySettingsSchema,
  durationSchemaWithMinimum,
} from './common';

export const entityDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  version: semVerSchema,
  name: z.string(),
  description: z.optional(z.string()),
  type: z.string(),
  filter: filterSchema,
  indexPatterns: arrayOfStringsSchema,
  identityFields: z.array(identityFieldsSchema),
  displayNameTemplate: z.string(),
  metadata: z.optional(z.array(metadataSchema)),
  metrics: z.optional(z.array(keyMetricSchema)),
  staticFields: z.optional(z.record(z.string(), z.string())),
  managed: z.optional(z.boolean()).default(false),
  history: z.object({
    timestampField: z.string(),
    interval: durationSchemaWithMinimum(1),
    settings: historySettingsSchema,
  }),
  latest: z.optional(
    z.object({
      settings: z.optional(
        z.object({
          syncField: z.optional(z.string()),
          syncDelay: z.optional(durationSchema),
          frequency: z.optional(durationSchema),
        })
      ),
    })
  ),
  installStatus: z.optional(
    z.union([
      z.literal('installing'),
      z.literal('upgrading'),
      z.literal('installed'),
      z.literal('failed'),
    ])
  ),
  installStartedAt: z.optional(z.string()),
});

export const entityDefinitionUpdateSchema = entityDefinitionSchema
  .omit({
    id: true,
    managed: true,
    installStatus: true,
    installStartedAt: true,
  })
  .partial()
  .merge(
    z.object({
      history: z.optional(entityDefinitionSchema.shape.history.partial()),
      version: semVerSchema,
    })
  );

export type EntityDefinition = z.infer<typeof entityDefinitionSchema>;
export type EntityDefinitionUpdate = z.infer<typeof entityDefinitionUpdateSchema>;
