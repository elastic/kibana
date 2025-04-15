/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { ModelValidation, Validation, modelValidation, validation } from '../validation';
import { IngestBase, ingestBase } from './base';
import {
  UnwiredIngestStreamEffectiveLifecycle,
  unwiredIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import { base } from '../base';
import { ElasticsearchAssets, elasticsearchAssetsSchema } from './common';
import { OmitName } from '../core';

/* eslint-disable @typescript-eslint/no-namespace */

export interface IngestUnwired {
  unwired: {};
}

export const IngestUnwired: z.Schema<IngestUnwired> = z.object({
  unwired: z.object({}),
});

export type UnwiredIngest = IngestBase & IngestUnwired;

export const UnwiredIngest: Validation<IngestBase, UnwiredIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestUnwired)
);

export namespace UnwiredStream {
  export interface Definition extends ingestBase.Definition {
    ingest: UnwiredIngest;
  }

  export interface Source extends base.Source, UnwiredStream.Definition {}

  export interface GetResponse extends ingestBase.GetResponse {
    stream: Definition;
    elasticsearch_assets?: ElasticsearchAssets;
    data_stream_exists: boolean;
    effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
  }

  export interface UpsertRequest extends ingestBase.UpsertRequest {
    stream: OmitName<Definition>;
  }

  export interface Model {
    Definition: UnwiredStream.Definition;
    Source: UnwiredStream.Source;
    GetResponse: UnwiredStream.GetResponse;
    UpsertRequest: UnwiredStream.UpsertRequest;
  }
}

export const UnwiredStream: ModelValidation<base.Model, UnwiredStream.Model> = modelValidation(
  base,
  {
    Definition: z.intersection(
      ingestBase.Definition.right,
      z.object({
        ingest: IngestUnwired,
      })
    ),
    Source: z.intersection(ingestBase.Source.right, z.object({})),
    GetResponse: z.intersection(
      ingestBase.GetResponse.right,
      z.object({
        elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
        data_stream_exists: z.boolean(),
        effective_lifecycle: unwiredIngestStreamEffectiveLifecycleSchema,
      })
    ),
    UpsertRequest: z.intersection(ingestBase.UpsertRequest.right, z.object({})),
  }
);
