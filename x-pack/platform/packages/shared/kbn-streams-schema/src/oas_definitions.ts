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
import { streamDefinitionSchema } from './models/streams';
import { fieldDefinitionSchema } from './fields';
import { routingDefinitionSchema } from './models/ingest/routing';
import { ingestStreamLifecycleSchema } from './models/ingest/lifecycle';

export const streamsOasDefinitions = {
  /**
   * Top-level discriminated union of all stream definition variants.
   * Registered with a `discriminator` extension so OAS code generators can
   * produce typed structs without inspecting nested properties.
   */
  StreamDefinition: streamDefinitionSchema,

  // Individual stream definition variants
  WiredStreamDefinition: WiredStream.Definition.right,
  ClassicStreamDefinition: ClassicStream.Definition.right,
  QueryStreamDefinition: QueryStream.Definition.right,

  // Ingest configs
  WiredIngest: WiredIngest.right,
  ClassicIngest: ClassicIngest.right,

  // Fields & routing
  FieldDefinition: fieldDefinitionSchema,
  RoutingDefinition: routingDefinitionSchema,

  // Lifecycle
  IngestStreamLifecycle: ingestStreamLifecycleSchema,
} as const;

export type StreamsOasDefinitions = typeof streamsOasDefinitions;
