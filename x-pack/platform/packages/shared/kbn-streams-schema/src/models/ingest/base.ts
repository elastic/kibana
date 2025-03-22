/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';
import { FieldDefinition, fieldDefinitionSchema } from './fields';
import { IngestStreamLifecycle, ingestStreamLifecycleSchema } from './lifecycle';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { RoutingDefinition, routingDefinitionSchema } from './routing';

interface IngestBase {
  lifecycle: IngestStreamLifecycle;
  processing: ProcessorDefinition[];
}

interface WiredIngest extends IngestBase {
  wired: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
  };
}

interface UnwiredIngest extends IngestBase {
  unwired: {};
}

interface WiredStreamDefinitionBase {
  ingest: WiredIngest;
  description: string;
}

interface UnwiredStreamDefinitionBase {
  ingest: UnwiredIngest;
  description: string;
}

interface WiredStreamDefinition extends StreamDefinitionBase {
  ingest: WiredIngest;
}

interface UnwiredStreamDefinition extends StreamDefinitionBase {
  ingest: UnwiredIngest;
}

type IngestStreamDefinition = WiredStreamDefinition | UnwiredStreamDefinition;

const ingestBaseSchema: z.Schema<IngestBase> = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: z.array(processorDefinitionSchema),
});

const unwiredIngestSchema: z.Schema<UnwiredIngest> = z.intersection(
  ingestBaseSchema,
  z.object({
    unwired: z.object({}),
  })
);

const wiredIngestSchema: z.Schema<WiredIngest> = z.intersection(
  ingestBaseSchema,
  z.object({
    wired: z.object({
      fields: fieldDefinitionSchema,
      routing: z.array(routingDefinitionSchema),
    }),
  })
);

const unwiredStreamDefinitionSchemaBase: z.Schema<UnwiredStreamDefinitionBase> = z.object({
  ingest: unwiredIngestSchema,
  description: z.string(),
});

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

type IngestStreamDefinitionBase = WiredStreamDefinitionBase | UnwiredStreamDefinitionBase;

const ingestStreamDefinitionSchemaBase: z.Schema<IngestStreamDefinitionBase> = z.union([
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
  type IngestStreamDefinitionBase,
  type UnwiredIngest,
  type UnwiredStreamDefinition,
  type WiredIngest,
  type WiredStreamDefinition,
};
