/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { createAsSchemaOrThrow, createIsNarrowSchema } from '../helpers';
import { streamUpsertRequestSchema } from './api';
import { streamDefinitionSchema } from './core';
import {
  groupStreamDefinitionSchemaBase,
  groupStreamDefinitionSchema,
  groupStreamUpsertRequestSchema,
} from './group';
import {
  ingestStreamDefinitionSchema,
  ingestUpsertRequestSchema,
  unwiredStreamDefinitionSchema,
  unwiredStreamUpsertRequestSchema,
  wiredIngestUpsertRequestSchema,
  wiredStreamDefinitionSchema,
  wiredStreamUpsertRequestSchema,
} from './ingest';

export const isIngestStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  ingestStreamDefinitionSchema
);

export const isWiredStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema
);

export const asIngestStreamDefinition = createAsSchemaOrThrow(
  streamDefinitionSchema,
  ingestStreamDefinitionSchema
);

export const asWiredStreamDefinition = createAsSchemaOrThrow(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema
);

export const isUnwiredStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  unwiredStreamDefinitionSchema
);

export const isGroupStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  groupStreamDefinitionSchema
);

export const isGroupStreamUpsertRequest = createIsNarrowSchema(
  streamUpsertRequestSchema,
  groupStreamUpsertRequestSchema
);

export const isUnwiredStreamUpsertRequest = createIsNarrowSchema(
  streamUpsertRequestSchema,
  unwiredStreamUpsertRequestSchema
);

export const isWiredStreamUpsertRequest = createIsNarrowSchema(
  streamUpsertRequestSchema,
  wiredStreamUpsertRequestSchema
);

export const isWiredIngestUpsertRequest = createIsNarrowSchema(
  ingestUpsertRequestSchema,
  wiredIngestUpsertRequestSchema
);

export const isGroupStreamDefinitionBase = createIsNarrowSchema(
  z.unknown(),
  groupStreamDefinitionSchemaBase
);

export const isRootStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema.refine((stream) => {
    return stream.name.split('.').length === 1;
  })
);
