/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { InheritedFieldDefinition, inheritedFieldDefinitionSchema } from './fields';
import {
  StreamGetResponseBase,
  StreamUpsertRequestBase,
  streamGetResponseSchemaBase,
  streamUpsertRequestSchemaBase,
} from '../base/api';
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
} from './base';
import { ElasticsearchAsset, elasticsearchAssetSchema } from './common';
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
 * Stream get response
 */
interface WiredStreamGetResponse extends StreamGetResponseBase {
  stream: WiredStreamDefinition;
  inherited_fields: InheritedFieldDefinition;
  effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
}

interface UnwiredStreamGetResponse extends StreamGetResponseBase {
  stream: UnwiredStreamDefinition;
  elasticsearch_assets: ElasticsearchAsset[];
  data_stream_exists: boolean;
  effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
}

type IngestStreamGetResponse = WiredStreamGetResponse | UnwiredStreamGetResponse;

/**
 * Ingest stream upsert request
 */

interface UnwiredStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: UnwiredIngestUpsertRequest;
}

interface WiredStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: WiredIngestUpsertRequest;
}

type IngestStreamUpsertRequest = WiredStreamUpsertRequest | UnwiredStreamUpsertRequest;

const unwiredStreamUpsertRequestSchema: z.Schema<UnwiredStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchemaBase,
  })
);

const wiredStreamUpsertRequestSchema: z.Schema<WiredStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchemaBase,
  })
);

const ingestStreamUpsertRequestSchema: z.Schema<IngestStreamUpsertRequest> = z.union([
  wiredStreamUpsertRequestSchema,
  unwiredStreamUpsertRequestSchema,
]);

const wiredStreamGetResponseSchema: z.Schema<WiredStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchema,
    inherited_fields: inheritedFieldDefinitionSchema,
    effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
  })
);

const unwiredStreamGetResponseSchema: z.Schema<UnwiredStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchema,
    elasticsearch_assets: z.array(elasticsearchAssetSchema),
    data_stream_exists: z.boolean(),
    effective_lifecycle: unwiredIngestStreamEffectiveLifecycleSchema,
  })
);

const ingestStreamGetResponseSchema: z.Schema<IngestStreamGetResponse> = z.union([
  wiredStreamGetResponseSchema,
  unwiredStreamGetResponseSchema,
]);

export {
  ingestStreamUpsertRequestSchema,
  ingestUpsertRequestSchema,
  ingestStreamGetResponseSchema,
  wiredStreamGetResponseSchema,
  unwiredStreamGetResponseSchema,
  type IngestGetResponse,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
  type IngestUpsertRequest,
  type UnwiredStreamGetResponse,
  type WiredStreamGetResponse,
  type UnwiredIngestUpsertRequest,
  type WiredIngestUpsertRequest,
};
