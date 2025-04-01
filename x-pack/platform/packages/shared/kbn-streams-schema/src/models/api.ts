/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  ingestStreamGetResponseSchema,
  ingestStreamUpsertRequestSchema,
  unwiredStreamGetResponseSchema,
  wiredStreamGetResponseSchema,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
} from './ingest';
import {
  GroupStreamGetResponse,
  groupStreamGetResponseSchema,
  GroupStreamUpsertRequest,
  groupStreamUpsertRequestSchema,
} from './group';
import { createAsSchemaOrThrow, createIsNarrowSchema } from '../helpers';

export const streamGetResponseSchema: z.Schema<StreamGetResponse> = z.union([
  ingestStreamGetResponseSchema,
  groupStreamGetResponseSchema,
]);

export const streamUpsertRequestSchema: z.Schema<StreamUpsertRequest> = z.union([
  ingestStreamUpsertRequestSchema,
  groupStreamUpsertRequestSchema,
]);

export const isWiredStreamGetResponse = createIsNarrowSchema(
  streamGetResponseSchema,
  wiredStreamGetResponseSchema
);

export const isUnwiredStreamGetResponse = createIsNarrowSchema(
  streamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

export const asWiredStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  wiredStreamGetResponseSchema
);

export const asUnwiredStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

export const asIngestStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  ingestStreamGetResponseSchema
);

export type StreamGetResponse = IngestStreamGetResponse | GroupStreamGetResponse;
export type StreamUpsertRequest = IngestStreamUpsertRequest | GroupStreamUpsertRequest;
