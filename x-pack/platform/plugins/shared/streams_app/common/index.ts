/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Streams } from '@kbn/streams-schema';

interface EntityBase {
  type: string;
  displayName: string;
  properties: Record<string, unknown>;
}

export type StreamEntity = EntityBase & { type: 'stream'; properties: Streams.all.Definition };

export type Entity = StreamEntity;

export interface EntityTypeDefinition {
  displayName: string;
}
