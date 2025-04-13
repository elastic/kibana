/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { streamQuerySchema, type StreamQuery } from '../base/api';
import {
  UnwiredIngest,
  UnwiredStreamDefinition,
  WiredIngest,
  WiredStreamDefinition,
  unwiredIngestSchema,
  unwiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchemaBase,
  wiredIngestSchema,
  wiredStreamDefinitionSchema,
  wiredStreamDefinitionSchemaBase,
  type UnwiredStreamDefinitionBase,
  type WiredStreamDefinitionBase,
} from './base';
import { ElasticsearchAssets, elasticsearchAssetsSchema } from './common';
import { InheritedFieldDefinition, inheritedFieldDefinitionSchema } from './fields';
import {
  UnwiredIngestStreamEffectiveLifecycle,
  WiredIngestStreamEffectiveLifecycle,
  unwiredIngestStreamEffectiveLifecycleSchema,
  wiredIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';

/**
 * Ingest get response
 */

interface WiredIngestResponse {
  ingest: WiredIngest;
}

interface UnwiredIngestResponse {
  ingest: UnwiredIngest;
}

type IngestGetResponse = WiredIngestResponse | UnwiredIngestResponse;

/**
 * Ingest upsert request
 */

interface WiredIngestUpsertRequest {
  ingest: WiredIngest;
}

interface UnwiredIngestUpsertRequest {
  ingest: UnwiredIngest;
}

type IngestUpsertRequest = WiredIngestUpsertRequest | UnwiredIngestUpsertRequest;

const wiredIngestUpsertRequestSchema: z.Schema<WiredIngestUpsertRequest> = z.object({
  ingest: wiredIngestSchema,
});

const unwiredIngestUpsertRequestSchema: z.Schema<UnwiredIngestUpsertRequest> = z.object({
  ingest: unwiredIngestSchema,
});

const ingestUpsertRequestSchema: z.Schema<IngestUpsertRequest> = z.union([
  wiredIngestUpsertRequestSchema,
  unwiredIngestUpsertRequestSchema,
]);

/**
 * Ingest Stream privileges schema
 */

interface IngestStreamPrivileges {
  // User can change everything about the stream
  manage: boolean;
  // User can read stats (like size in bytes) about the stream
  monitor: boolean;
  // User can change the retention policy of the stream
  lifecycle: boolean;
  // User can simulate changes to the processing or the mapping of the stream
  simulate: boolean;
}

const ingestStreamPrivilegesSchema: z.Schema<IngestStreamPrivileges> = z.object({
  manage: z.boolean(),
  monitor: z.boolean(),
  lifecycle: z.boolean(),
  simulate: z.boolean(),
});

/**
 * Ingest Stream Get response
 */
interface WiredStreamGetResponse {
  dashboards: string[];
  queries: StreamQuery[];
  stream: WiredStreamDefinition;
  inherited_fields: InheritedFieldDefinition;
  effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
  privileges: IngestStreamPrivileges;
}

const wiredStreamGetResponseSchema: z.Schema<WiredStreamGetResponse> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: wiredStreamDefinitionSchema,
  inherited_fields: inheritedFieldDefinitionSchema,
  effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
  privileges: ingestStreamPrivilegesSchema,
});

interface UnwiredStreamGetResponse {
  dashboards: string[];
  queries: StreamQuery[];
  stream: UnwiredStreamDefinition;
  elasticsearch_assets?: ElasticsearchAssets;
  data_stream_exists: boolean;
  effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
  privileges: IngestStreamPrivileges;
}

const unwiredStreamGetResponseSchema: z.Schema<UnwiredStreamGetResponse> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: unwiredStreamDefinitionSchema,
  elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
  data_stream_exists: z.boolean(),
  effective_lifecycle: unwiredIngestStreamEffectiveLifecycleSchema,
  privileges: ingestStreamPrivilegesSchema,
});

type IngestStreamGetResponse = WiredStreamGetResponse | UnwiredStreamGetResponse;

const ingestStreamGetResponseSchema: z.Schema<IngestStreamGetResponse> = z.union([
  wiredStreamGetResponseSchema,
  unwiredStreamGetResponseSchema,
]);

/**
 * Ingest stream upsert request
 */

interface UnwiredStreamUpsertRequest {
  dashboards: string[];
  queries: StreamQuery[];
  stream: UnwiredStreamDefinitionBase;
}

const unwiredStreamUpsertRequestSchema: z.Schema<UnwiredStreamUpsertRequest> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: unwiredStreamDefinitionSchemaBase,
});

interface WiredStreamUpsertRequest {
  dashboards: string[];
  queries: StreamQuery[];
  stream: WiredStreamDefinitionBase;
}

const wiredStreamUpsertRequestSchema: z.Schema<WiredStreamUpsertRequest> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
  stream: wiredStreamDefinitionSchemaBase,
});

type IngestStreamUpsertRequest = WiredStreamUpsertRequest | UnwiredStreamUpsertRequest;

const ingestStreamUpsertRequestSchema: z.Schema<IngestStreamUpsertRequest> = z.union([
  wiredStreamUpsertRequestSchema,
  unwiredStreamUpsertRequestSchema,
]);

export {
  ingestStreamGetResponseSchema,
  ingestStreamUpsertRequestSchema,
  ingestUpsertRequestSchema,
  unwiredStreamGetResponseSchema,
  unwiredStreamUpsertRequestSchema,
  wiredStreamGetResponseSchema,
  wiredStreamUpsertRequestSchema,
  type IngestGetResponse,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
  type IngestUpsertRequest,
  type UnwiredIngestResponse,
  type UnwiredIngestUpsertRequest,
  type UnwiredStreamGetResponse,
  type UnwiredStreamUpsertRequest,
  type WiredIngestResponse,
  type WiredIngestUpsertRequest,
  type WiredStreamGetResponse,
  type WiredStreamUpsertRequest,
};
