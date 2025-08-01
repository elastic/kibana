/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, IngestBaseStream } from './base';
import {
  ClassicIngestStreamEffectiveLifecycle,
  classicIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import { ElasticsearchAssets, elasticsearchAssetsSchema } from './common';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';
import { BaseStream } from '../base';

/* eslint-disable @typescript-eslint/no-namespace */

export interface IngestClassic {
  classic: {};
}

export const IngestClassic: z.Schema<IngestClassic> = z.object({
  classic: z.object({}),
});

export type ClassicIngest = IngestBase & IngestClassic;

export const ClassicIngest: Validation<IngestBase, ClassicIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestClassic)
);

export namespace ClassicStream {
  export interface Definition extends IngestBaseStream.Definition {
    ingest: ClassicIngest;
  }

  export type Source = IngestBaseStream.Source<ClassicStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    elasticsearch_assets?: ElasticsearchAssets;
    data_stream_exists: boolean;
    effective_lifecycle: ClassicIngestStreamEffectiveLifecycle;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<Definition>;

  export interface Model {
    Definition: ClassicStream.Definition;
    Source: ClassicStream.Source;
    GetResponse: ClassicStream.GetResponse;
    UpsertRequest: ClassicStream.UpsertRequest;
  }
}

export const ClassicStream: ModelValidation<BaseStream.Model, ClassicStream.Model> =
  modelValidation(BaseStream, {
    Definition: z.intersection(
      IngestBaseStream.Definition.right,
      z.object({
        ingest: IngestClassic,
      })
    ),
    Source: z.intersection(IngestBaseStream.Source.right, z.object({})),
    GetResponse: z.intersection(
      IngestBaseStream.GetResponse.right,
      z.object({
        elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
        data_stream_exists: z.boolean(),
        effective_lifecycle: classicIngestStreamEffectiveLifecycleSchema,
      })
    ),
    UpsertRequest: z.intersection(IngestBaseStream.UpsertRequest.right, z.object({})),
  });
