/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { FieldDefinition, fieldDefinitionSchema } from './fields';
import { IngestStreamLifecycle, ingestStreamLifecycleSchema } from './lifecycle';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { RoutingDefinition, routingDefinitionSchema } from './routing';

interface WiredIngest {
  lifecycle: IngestStreamLifecycle;
  processing: ProcessorDefinition[];
  wired: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
  };
}

const wiredIngestSchema: z.Schema<WiredIngest> = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: z.array(processorDefinitionSchema),
  wired: z.object({
    fields: fieldDefinitionSchema,
    routing: z.array(routingDefinitionSchema),
  }),
});

interface UnwiredIngest {
  lifecycle: IngestStreamLifecycle;
  processing: ProcessorDefinition[];
  unwired: {};
}

const unwiredIngestSchema: z.Schema<UnwiredIngest> = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: z.array(processorDefinitionSchema),
  unwired: z.object({}),
});

interface WiredStreamDefinition {
  name: string;
  description: string;
  ingest: WiredIngest;
}

interface UnwiredStreamDefinition {
  name: string;
  description: string;
  ingest: UnwiredIngest;
}

type IngestStreamDefinition = WiredStreamDefinition | UnwiredStreamDefinition;

interface UnwiredStreamDefinitionBase {
  ingest: UnwiredIngest;
  description: string;
}

const unwiredStreamDefinitionSchemaBase: z.Schema<UnwiredStreamDefinitionBase> = z.object({
  ingest: unwiredIngestSchema,
  description: z.string(),
});

interface WiredStreamDefinitionBase {
  ingest: WiredIngest;
  description: string;
}

const wiredStreamDefinitionSchemaBase: z.Schema<WiredStreamDefinitionBase> = z.object({
  ingest: wiredIngestSchema,
  description: z.string(),
});

const wiredStreamDefinitionSchema: z.Schema<WiredStreamDefinition> = z.intersection(
  z.object({
    name: NonEmptyString,
  }),
  wiredStreamDefinitionSchemaBase
);

const unwiredStreamDefinitionSchema: z.Schema<UnwiredStreamDefinition> = z.intersection(
  z.object({
    name: NonEmptyString,
  }),
  unwiredStreamDefinitionSchemaBase
);

const ingestStreamDefinitionSchema: z.Schema<IngestStreamDefinition> = z.union([
  wiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchema,
]);

const ingestStreamDefinitionSchemaBase: z.Schema<Omit<IngestStreamDefinition, 'name'>> = z.union([
  wiredStreamDefinitionSchemaBase,
  unwiredStreamDefinitionSchemaBase,
]);

export {
  ingestStreamDefinitionSchema,
  ingestStreamDefinitionSchemaBase,
  unwiredIngestSchema,
  unwiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchemaBase,
  wiredIngestSchema,
  wiredStreamDefinitionSchema,
  wiredStreamDefinitionSchemaBase,
  type IngestStreamDefinition,
  type UnwiredIngest,
  type UnwiredStreamDefinition,
  type WiredIngest,
  type WiredStreamDefinition,
};
