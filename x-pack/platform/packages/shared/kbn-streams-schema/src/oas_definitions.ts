/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of kbn-streams-schema Zod v4 schemas that should be emitted as
 * named OAS components (`$ref: '#/components/schemas/<key>'`) rather than
 * inlined at every use site.
 *
 * Pass this object to the OAS integration layer (e.g. call
 * `registerZodV4Component` from `@kbn/router-to-openapispec` for each entry)
 * to activate named references in the generated spec.
 */

import { WiredStream } from './models/ingest/wired';
import { ClassicStream, ClassicIngest } from './models/ingest/classic';
import { WiredIngest } from './models/ingest/wired';
import { fieldDefinitionSchema } from './fields';
import { routingDefinitionSchema } from './models/ingest/routing';
import { ingestStreamLifecycleSchema } from './models/ingest/lifecycle';

export const streamsOasDefinitions = {
  // Complete stream definitions
  WiredStreamDefinition: WiredStream.Definition.right,
  ClassicStreamDefinition: ClassicStream.Definition.right,

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
