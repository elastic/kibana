/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { arrayOfStringsSchema } from './common';

export const entityBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  identityFields: arrayOfStringsSchema,
  displayName: z.string(),
  metrics: z.record(z.string(), z.number()),
  definitionVersion: z.string(),
  schemaVersion: z.string(),
  definitionId: z.string(),
});

export interface MetadataRecord {
  [key: string]: string[] | MetadataRecord | string;
}

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Metadata = Literal | { [key: string]: Metadata } | Metadata[];
export const entityMetadataSchema: z.ZodType<Metadata> = z.lazy(() =>
  z.union([literalSchema, z.array(entityMetadataSchema), z.record(entityMetadataSchema)])
);

export const entityLatestSchema = z
  .object({
    event: z.object({
      ingested: z.string(),
    }),
    entity: entityBaseSchema.merge(
      z.object({
        lastSeenTimestamp: z.string(),
        firstSeenTimestamp: z.string(),
      })
    ),
  })
  .and(entityMetadataSchema);

export type EntityLatestDoc = z.infer<typeof entityLatestSchema>;

export const entityHistorySchema = z
  .object({
    '@timestamp': z.string(),
    entity: entityBaseSchema,
  })
  .and(entityMetadataSchema);

export type EntityHistoryDoc = z.infer<typeof entityHistorySchema>;
