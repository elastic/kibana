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
  latest: z.object({
    timestampField: z.string(),
    lookbackPeriod: z.optional(durationSchema).default('24h'),
    settings: z.optional(
      z.object({
        syncField: z.optional(z.string()),
        syncDelay: z.optional(durationSchema),
        frequency: z.optional(durationSchema),
        timeout: z.optional(durationSchema),
        docsPerSecond: z.optional(z.number()),
      })
    ),
  }),
  installStatus: z.optional(
    z.union([
      z.literal('installing'),
      z.literal('upgrading'),
      z.literal('installed'),
      z.literal('failed'),
    ])
  ),
  installStartedAt: z.optional(z.string()),
  installedComponents: z.optional(
    z.array(
      z.object({
        type: z.union([
          z.literal('transform'),
          z.literal('ingest_pipeline'),
          z.literal('template'),
        ]),
        id: z.string(),
      })
    )
  ),
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
      latest: z.optional(entityDefinitionSchema.shape.latest.partial()),
      version: semVerSchema,
    })
  );

export type EntityDefinition = z.infer<typeof entityDefinitionSchema>;
export type EntityDefinitionUpdate = z.infer<typeof entityDefinitionUpdateSchema>;
