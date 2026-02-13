/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { IngestStreamLifecycle, FailureStore, FieldDefinition } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';

/**
 * Options for modifying ingest properties during upsert request construction.
 */
interface IngestModifications {
  lifecycle?: IngestStreamLifecycle;
  failure_store?: FailureStore;
  processing?: { steps: StreamlangDSL['steps'] };
  wiredFields?: FieldDefinition;
}

/**
 * Strips processing.updated_at from the ingest config to build a valid upsert request.
 */
function stripProcessingUpdatedAt(
  processing: { steps: StreamlangDSL['steps']; updated_at: string }
): { steps: StreamlangDSL['steps'] } {
  const { updated_at: _updatedAt, ...rest } = processing;
  return rest;
}

/**
 * Builds a full upsert request from a WiredStream Definition,
 * applying optional ingest modifications.
 */
function buildWiredUpsertRequest(
  stream: Streams.WiredStream.Definition,
  mods: IngestModifications,
  overrides?: { description?: string }
): Streams.WiredStream.UpsertRequest {
  const { name: _name, updated_at: _updatedAt, ...streamRest } = stream;
  return {
    dashboards: [],
    queries: [],
    rules: [],
    stream: {
      ...streamRest,
      ...(overrides?.description !== undefined ? { description: overrides.description } : {}),
      ingest: {
        ...stream.ingest,
        processing: stripProcessingUpdatedAt(stream.ingest.processing),
        ...(mods.lifecycle !== undefined ? { lifecycle: mods.lifecycle } : {}),
        ...(mods.failure_store !== undefined ? { failure_store: mods.failure_store } : {}),
        ...(mods.processing !== undefined ? { processing: mods.processing } : {}),
        ...(mods.wiredFields !== undefined
          ? {
              wired: {
                ...stream.ingest.wired,
                fields: { ...stream.ingest.wired.fields, ...mods.wiredFields },
              },
            }
          : {}),
      },
    },
  };
}

/**
 * Builds a full upsert request from a ClassicStream Definition,
 * applying optional ingest modifications.
 */
function buildClassicUpsertRequest(
  stream: Streams.ClassicStream.Definition,
  mods: IngestModifications,
  overrides?: { description?: string }
): Streams.ClassicStream.UpsertRequest {
  const { name: _name, updated_at: _updatedAt, ...streamRest } = stream;
  return {
    dashboards: [],
    queries: [],
    rules: [],
    stream: {
      ...streamRest,
      ...(overrides?.description !== undefined ? { description: overrides.description } : {}),
      ingest: {
        ...stream.ingest,
        processing: stripProcessingUpdatedAt(stream.ingest.processing),
        ...(mods.lifecycle !== undefined ? { lifecycle: mods.lifecycle } : {}),
        ...(mods.failure_store !== undefined ? { failure_store: mods.failure_store } : {}),
        ...(mods.processing !== undefined ? { processing: mods.processing } : {}),
      },
    },
  };
}

/**
 * Builds a full upsert request from an ingest stream definition, applying optional modifications.
 * Handles WiredStream / ClassicStream discrimination so callers don't need to narrow.
 */
export function buildIngestUpsertRequest(
  stream: Streams.WiredStream.Definition | Streams.ClassicStream.Definition,
  mods: IngestModifications = {},
  overrides?: { description?: string }
): Streams.all.UpsertRequest {
  if (Streams.WiredStream.Definition.is(stream)) {
    return buildWiredUpsertRequest(stream, mods, overrides);
  }
  return buildClassicUpsertRequest(stream, mods, overrides);
}

/**
 * Builds a full upsert request with only top-level overrides (e.g. description).
 */
export function buildUpsertRequest(
  stream: Streams.WiredStream.Definition | Streams.ClassicStream.Definition,
  overrides?: { description?: string }
): Streams.all.UpsertRequest {
  return buildIngestUpsertRequest(stream, {}, overrides);
}
