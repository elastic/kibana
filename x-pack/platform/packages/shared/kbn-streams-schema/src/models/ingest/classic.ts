/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, IngestBaseStream, IngestBaseUpsertRequest } from './base';
import type { ClassicIngestStreamEffectiveLifecycle } from './lifecycle';
import { classicIngestStreamEffectiveLifecycleSchema } from './lifecycle';
import type { ElasticsearchAssets } from './common';
import { elasticsearchAssetsSchema } from './common';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { ModelOfSchema, ModelValidation } from '../validation/model_validation';
import { modelValidation } from '../validation/model_validation';
import { BaseStream } from '../base';
import type { IngestStreamSettings } from './settings';
import { ingestStreamSettingsSchema } from './settings';
import type { FieldDefinition } from '../../fields';
import { fieldDefinitionSchema } from '../../fields';
import type { EffectiveFailureStore } from './failure_store';
import { effectiveFailureStoreSchema } from './failure_store';

/* eslint-disable @typescript-eslint/no-namespace */

export interface IngestClassic {
  classic: {
    field_overrides?: FieldDefinition;
  };
}

export const IngestClassic: z.Schema<IngestClassic> = z.object({
  classic: z.object({
    field_overrides: z.optional(fieldDefinitionSchema),
  }),
});

export type ClassicIngest = IngestBase & IngestClassic;

export const ClassicIngest: Validation<IngestBase, ClassicIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestClassic)
);

type IngestClassicUpsertRequest = IngestClassic;

const IngestClassicUpsertRequest = IngestClassic;

export type ClassicIngestUpsertRequest = IngestBaseUpsertRequest & IngestClassicUpsertRequest;

export const ClassicIngestUpsertRequest: Validation<
  IngestBaseUpsertRequest,
  ClassicIngestUpsertRequest
> = validation(
  IngestBaseUpsertRequest.right,
  z.intersection(IngestBaseUpsertRequest.right, IngestClassicUpsertRequest)
);

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

type ClassicStreamDefaults = {
  Source: z.input<IClassicStreamSchema['Definition']>;
  GetResponse: {
    stream: z.input<IClassicStreamSchema['Definition']>;
  };
  UpsertRequest: {
    stream: OmitClassicStreamUpsertProps<{} & z.input<IClassicStreamSchema['Definition']>>;
  };
} & ModelOfSchema<IClassicStreamSchema>;

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

const ClassicStreamSchema = {
  Definition: z.object({
    ingest: ClassicIngest.right,
  }),
  Source: z.intersection(IngestBaseStream.Source.right, z.object({})),
  GetResponse: z.intersection(
    IngestBaseStream.GetResponse.right,
    z.object({
      elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
      data_stream_exists: z.boolean(),
      effective_lifecycle: classicIngestStreamEffectiveLifecycleSchema,
      effective_settings: ingestStreamSettingsSchema,
      effective_failure_store: effectiveFailureStoreSchema,
    })
  ),
  UpsertRequest: z.intersection(IngestBaseStream.UpsertRequest.right, z.object({})),
};
type IClassicStreamSchema = typeof ClassicStreamSchema;

export const ClassicStream: ModelValidation<BaseStream.Model, ClassicStream.Model> =
  modelValidation<BaseStream.Model, IClassicStreamSchema, ClassicStreamDefaults>(
    BaseStream,
    ClassicStreamSchema
  );

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
