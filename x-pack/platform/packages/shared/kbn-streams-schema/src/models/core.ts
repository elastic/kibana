/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createIsNarrowSchema } from '../helpers';
import { IngestStreamDefinition, ingestStreamDefinitionSchema } from './ingest';
import { GroupStreamDefinition, groupStreamDefinitionSchema } from './group';

export type StreamDefinition = IngestStreamDefinition | GroupStreamDefinition;

export const streamDefinitionSchema: z.Schema<StreamDefinition> = z.union([
  ingestStreamDefinitionSchema,
  groupStreamDefinitionSchema,
]);

export const isStreamDefinition = createIsNarrowSchema(z.unknown(), streamDefinitionSchema);

export type Primitive = string | number | boolean | null | undefined;

export const primitive: z.ZodType<Primitive> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

export interface RecursiveRecord {
  [key: PropertyKey]: Primitive | Primitive[] | RecursiveRecord;
}

export const recursiveRecord: z.ZodType<RecursiveRecord> = z.record(
  z.union([primitive, z.array(primitive), z.lazy(() => recursiveRecord)])
);
