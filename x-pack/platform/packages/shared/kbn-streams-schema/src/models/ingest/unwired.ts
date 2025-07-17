/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, IngestBaseStream } from './base';
import {
  UnwiredIngestStreamEffectiveLifecycle,
  unwiredIngestStreamEffectiveLifecycleSchema,
} from './lifecycle';
import { ElasticsearchAssets, elasticsearchAssetsSchema } from './common';
import { Validation, validation } from '../validation/validation';
import { ModelValidation, modelValidation } from '../validation/model_validation';
import { BaseStream } from '../base';
import { FieldDefinition, fieldDefinitionSchema } from '../../fields';

/* eslint-disable @typescript-eslint/no-namespace */

export interface IngestUnwired {
  unwired: {
    field_overrides?: FieldDefinition;
  };
}

export const IngestUnwired: z.Schema<IngestUnwired> = z.object({
  unwired: z.object({
    field_overrides: z.optional(fieldDefinitionSchema),
  }),
});

export type UnwiredIngest = IngestBase & IngestUnwired;

export const UnwiredIngest: Validation<IngestBase, UnwiredIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestUnwired)
);

export namespace UnwiredStream {
  export interface Definition extends IngestBaseStream.Definition {
    ingest: UnwiredIngest;
  }

  export type Source = IngestBaseStream.Source<UnwiredStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    elasticsearch_assets?: ElasticsearchAssets;
    data_stream_exists: boolean;
    effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<Definition>;

  export interface Model {
    Definition: UnwiredStream.Definition;
    Source: UnwiredStream.Source;
    GetResponse: UnwiredStream.GetResponse;
    UpsertRequest: UnwiredStream.UpsertRequest;
  }
}

export const UnwiredStream: ModelValidation<BaseStream.Model, UnwiredStream.Model> =
  modelValidation(BaseStream, {
    Definition: z.intersection(
      IngestBaseStream.Definition.right,
      z.object({
        ingest: IngestUnwired,
      })
    ),
    Source: z.intersection(IngestBaseStream.Source.right, z.object({})),
    GetResponse: z.intersection(
      IngestBaseStream.GetResponse.right,
      z.object({
        elasticsearch_assets: z.optional(elasticsearchAssetsSchema),
        data_stream_exists: z.boolean(),
        effective_lifecycle: unwiredIngestStreamEffectiveLifecycleSchema,
      })
    ),
    UpsertRequest: z.intersection(IngestBaseStream.UpsertRequest.right, z.object({})),
  });
