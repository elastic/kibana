/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { IngestBaseStream } from './base';
import {
  IngestBase,
  IngestBaseUpsertRequest,
  ingestBaseStreamDefinitionSchema,
  ingestBaseStreamGetResponseSchema,
  ingestBaseStreamUpsertRequestSchema,
} from './base';
import type { ClassicIngestStreamEffectiveLifecycle } from './lifecycle';
import {
  ingestStreamLifecycleSchema,
  classicIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import type { ElasticsearchAssets } from './common';
import { elasticsearchAssetsSchema } from './common';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { BaseStream } from '../base';
import type { IngestStreamSettings } from './settings';
import { ingestStreamSettingsSchema } from './settings';
import type { ClassicFieldDefinition } from '../../fields';
import { classicFieldDefinitionSchema } from '../../fields';
import type { EffectiveFailureStore } from './failure_store';
import { effectiveFailureStoreSchema, failureStoreSchema } from './failure_store';
import { ingestStreamProcessingSchema } from './processing';

/* eslint-disable @typescript-eslint/no-namespace */

export interface IngestClassic {
  classic: {
    field_overrides?: ClassicFieldDefinition;
  };
}

const ingestClassicShape = {
  classic: z.object({
    field_overrides: z.optional(classicFieldDefinitionSchema),
  }),
};

export type ClassicIngest = IngestBase & IngestClassic;

const classicIngestSchemaObject = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: ingestStreamProcessingSchema,
  settings: ingestStreamSettingsSchema,
  failure_store: failureStoreSchema,
  ...ingestClassicShape,
});

export const ClassicIngest: Validation<IngestBase, ClassicIngest> = validation(
  IngestBase.right,
  classicIngestSchemaObject
);

export type ClassicIngestUpsertRequest = IngestBaseUpsertRequest & IngestClassic;

const classicIngestUpsertSchemaObject = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: ingestStreamProcessingSchema.merge(
    z.object({ updated_at: z.undefined().optional() })
  ),
  settings: ingestStreamSettingsSchema,
  failure_store: failureStoreSchema,
  ...ingestClassicShape,
});

export const ClassicIngestUpsertRequest: Validation<
  IngestBaseUpsertRequest,
  ClassicIngestUpsertRequest
> = validation(IngestBaseUpsertRequest.right, classicIngestUpsertSchemaObject);

type OmitClassicStreamUpsertProps<
  T extends {
    ingest: Omit<ClassicIngest, 'processing'> & {
      processing: Omit<ClassicIngest['processing'], 'updated_at'> & { updated_at?: string };
    };
  }
> = Omit<T, 'ingest'> & {
  ingest: Omit<ClassicIngest, 'processing'> & {
    processing: Omit<ClassicIngest['processing'], 'updated_at'> & { updated_at?: never };
  };
};

export namespace ClassicStream {
  export interface Definition extends IngestBaseStream.Definition {
    ingest: ClassicIngest;
  }

  export type Source = IngestBaseStream.Source<ClassicStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    elasticsearch_assets?: ElasticsearchAssets;
    data_stream_exists: boolean;
    effective_lifecycle: ClassicIngestStreamEffectiveLifecycle;
    effective_failure_store: EffectiveFailureStore;
    effective_settings: IngestStreamSettings;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<
    OmitClassicStreamUpsertProps<Definition>
  >;

  export interface Model {
    Definition: ClassicStream.Definition;
    Source: ClassicStream.Source;
    GetResponse: ClassicStream.GetResponse;
    UpsertRequest: ClassicStream.UpsertRequest;
  }
}

const classicStreamDefinitionSchema = ingestBaseStreamDefinitionSchema.extend({
  ingest: classicIngestSchemaObject,
});

const classicStreamGetResponseSchema = ingestBaseStreamGetResponseSchema.extend({
  stream: classicStreamDefinitionSchema,
  elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
  data_stream_exists: z.boolean(),
  effective_lifecycle: classicIngestStreamEffectiveLifecycleSchema,
  effective_settings: ingestStreamSettingsSchema,
  effective_failure_store: effectiveFailureStoreSchema,
});

const classicStreamUpsertRequestSchema = ingestBaseStreamUpsertRequestSchema.extend({
  stream: ingestBaseStreamDefinitionSchema
    .omit({ name: true, updated_at: true })
    .extend({ ingest: classicIngestUpsertSchemaObject }),
});

export const ClassicStream: {
  Definition: Validation<BaseStream.Model['Definition'], ClassicStream.Definition>;
  Source: Validation<BaseStream.Model['Definition'], ClassicStream.Source>;
  GetResponse: Validation<BaseStream.Model['GetResponse'], ClassicStream.GetResponse>;
  UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], ClassicStream.UpsertRequest>;
} = {
  Definition: validation(
    classicStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    classicStreamDefinitionSchema
  ),
  Source: validation(
    classicStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    classicStreamDefinitionSchema
  ),
  GetResponse: validation(
    classicStreamGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
    classicStreamGetResponseSchema
  ),
  UpsertRequest: validation(
    classicStreamUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
    classicStreamUpsertRequestSchema
  ),
};

// Optimized implementation for Definition check - the fallback is a zod-based check
ClassicStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is ClassicStream.Definition =>
  Boolean(
    'ingest' in stream &&
      typeof stream.ingest === 'object' &&
      stream.ingest &&
      'classic' in stream.ingest
  );
