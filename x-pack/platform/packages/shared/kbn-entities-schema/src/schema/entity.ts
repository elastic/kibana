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
  identity_fields: z.union([arrayOfStringsSchema, z.string()]),
  display_name: z.string(),
  metrics: z.optional(z.record(z.string(), z.number())),
  definition_version: z.string(),
  schema_version: z.string(),
  definition_id: z.string(),
});

export interface MetadataRecord {
  [key: string]: string[] | MetadataRecord | string;
}

export interface EntityV2 {
  'entity.id': string;
  'entity.type': string;
  'entity.display_name': string;
  'entity.last_seen_timestamp'?: string;
  [metadata: string]: any;
}

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof literalSchema>;
interface Metadata {
  [key: string]: Metadata | Literal | Literal[];
}
export const entityMetadataSchema: z.ZodType<Metadata> = z.lazy(() =>
  z.record(z.string(), z.union([literalSchema, z.array(literalSchema), entityMetadataSchema]))
);

export const entityLatestSchema = z
  .object({
    entity: entityBaseSchema.merge(
      z.object({
        last_seen_timestamp: z.string(),
      })
    ),
  })
  .and(entityMetadataSchema);

export type EntityInstance = z.infer<typeof entityLatestSchema>;
export type EntityMetadata = z.infer<typeof entityMetadataSchema>;
