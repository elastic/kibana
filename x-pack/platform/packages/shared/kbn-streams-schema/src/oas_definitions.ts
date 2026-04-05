/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of kbn-streams-schema Zod v4 schemas emitted as named OAS components
 * (`$ref: '#/components/schemas/<key>'`). Each schema carries `.meta({ id })`
 * at its definition site, so the OAS generator picks it up automatically via
 * the Zod v4 global registry — no separate registration step required.
 */

import { WiredStream } from './models/ingest/wired';
import { ClassicStream, ClassicIngest } from './models/ingest/classic';
import { WiredIngest } from './models/ingest/wired';
import { QueryStream } from './models/query';
import { streamDefinitionSchema, Streams } from './models/streams';
import {
  fieldDefinitionSchema,
  fieldDefinitionConfigSchema,
  classicFieldDefinitionSchema,
  classicFieldDefinitionConfigSchema,
  inheritedFieldDefinitionSchema,
} from './fields';
import { routingDefinitionSchema } from './models/ingest/routing';
import {
  ingestStreamLifecycleSchema,
  classicIngestStreamEffectiveLifecycleSchema,
  wiredIngestStreamEffectiveLifecycleSchema,
} from './models/ingest/lifecycle';
import { effectiveFailureStoreSchema, failureStoreSchema } from './models/ingest/failure_store';

export const streamsOasDefinitions = {
  /**
   * Top-level union of all stream definition variants, with an explicit OAS
   * discriminator on `type`. .meta({ id: 'StreamDefinition', openapi: { discriminator } })
   * is applied at definition time in models/streams.ts.
   */
  StreamDefinition: streamDefinitionSchema,

  // Individual stream definition variants
  // .meta({ id }) applied at definition time in their respective files
  WiredStreamDefinition: WiredStream.Definition.right,
  ClassicStreamDefinition: ClassicStream.Definition.right,
  QueryStreamDefinition: QueryStream.Definition.right,

  // Get response union and variants
  // .meta({ id }) applied at definition time in their respective files
  StreamGetResponse: Streams.all.GetResponse.right,
  WiredStreamGetResponse: WiredStream.GetResponse.right,
  ClassicStreamGetResponse: ClassicStream.GetResponse.right,
  QueryStreamGetResponse: QueryStream.GetResponse.right,

  // Upsert request union and variants
  // .meta({ id }) applied at definition time in their respective files
  StreamUpsertRequest: Streams.all.UpsertRequest.right,
  WiredStreamUpsertRequest: WiredStream.UpsertRequest.right,
  ClassicStreamUpsertRequest: ClassicStream.UpsertRequest.right,
  QueryStreamUpsertRequest: QueryStream.UpsertRequest.right,

  // Ingest configs
  WiredIngest: WiredIngest.right,
  ClassicIngest: ClassicIngest.right,

  // Fields & routing
  FieldDefinition: fieldDefinitionSchema,
  FieldDefinitionConfig: fieldDefinitionConfigSchema,
  ClassicFieldDefinition: classicFieldDefinitionSchema,
  ClassicFieldDefinitionConfig: classicFieldDefinitionConfigSchema,
  InheritedFieldDefinition: inheritedFieldDefinitionSchema,
  RoutingDefinition: routingDefinitionSchema,

  // Lifecycle
  // .meta({ id }) applied at definition time in lifecycle/index.ts
  IngestStreamLifecycle: ingestStreamLifecycleSchema,
  ClassicIngestStreamEffectiveLifecycle: classicIngestStreamEffectiveLifecycleSchema,
  WiredIngestStreamEffectiveLifecycle: wiredIngestStreamEffectiveLifecycleSchema,

  // Failure store
  // .meta({ id }) applied at definition time in failure_store/index.ts
  FailureStore: failureStoreSchema,
  EffectiveFailureStore: effectiveFailureStoreSchema,
} as const;

export type StreamsOasDefinitions = typeof streamsOasDefinitions;
