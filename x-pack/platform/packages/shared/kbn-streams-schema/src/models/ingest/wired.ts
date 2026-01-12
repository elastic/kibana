/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IngestBase, IngestBaseStream, IngestBaseUpsertRequest } from './base';
import type { RoutingDefinition } from './routing';
import { routingDefinitionListSchema } from './routing';
import type { WiredIngestStreamEffectiveLifecycle } from './lifecycle';
import { wiredIngestStreamEffectiveLifecycleSchema } from './lifecycle';
import type { FieldDefinition, InheritedFieldDefinition } from '../../fields';
import { fieldDefinitionSchema, inheritedFieldDefinitionSchema } from '../../fields';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { ModelOfSchema, ModelValidation } from '../validation/model_validation';
import { modelValidation } from '../validation/model_validation';
import { BaseStream } from '../base';
import type { WiredIngestStreamEffectiveSettings } from './settings';
import { wiredIngestStreamEffectiveSettingsSchema } from './settings';
import type { WiredIngestStreamEffectiveFailureStore } from './failure_store';
import { wiredIngestStreamEffectiveFailureStoreSchema } from './failure_store';

/* eslint-disable @typescript-eslint/no-namespace */

interface IngestWired {
  wired: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
  };
}

const IngestWired: z.Schema<IngestWired> = z.object({
  wired: z.object({
    fields: fieldDefinitionSchema,
    routing: routingDefinitionListSchema,
  }),
});

export type WiredIngest = IngestBase & IngestWired;

export const WiredIngest: Validation<IngestBase, WiredIngest> = validation(
  IngestBase.right,
  z.intersection(IngestBase.right, IngestWired)
);

type IngestWiredUpsertRequest = IngestWired;

const IngestWiredUpsertRequest = IngestWired;

export type WiredIngestUpsertRequest = IngestBaseUpsertRequest & IngestWiredUpsertRequest;

export const WiredIngestUpsertRequest: Validation<
  IngestBaseUpsertRequest,
  WiredIngestUpsertRequest
> = validation(
  IngestBaseUpsertRequest.right,
  z.intersection(IngestBaseUpsertRequest.right, IngestWiredUpsertRequest)
);

type OmitWiredStreamUpsertProps<
  T extends {
    ingest: Omit<WiredIngest, 'processing'> & {
      processing: Omit<WiredIngest['processing'], 'updated_at'> & { updated_at?: string };
    };
  }
> = Omit<T, 'ingest'> & {
  ingest: Omit<WiredIngest, 'processing'> & {
    processing: Omit<WiredIngest['processing'], 'updated_at'> & { updated_at?: never };
  };
};

type WiredStreamsDefaults = {
  Source: z.input<IWiredStreamSchema['Definition']>;
  GetResponse: {
    stream: z.input<IWiredStreamSchema['Definition']>;
  };
  UpsertRequest: {
    stream: OmitWiredStreamUpsertProps<{} & z.input<IWiredStreamSchema['Definition']>>;
  };
} & ModelOfSchema<IWiredStreamSchema>;

export namespace WiredStream {
  export interface Model {
    Definition: WiredStream.Definition;
    Source: WiredStream.Source;
    GetResponse: WiredStream.GetResponse;
    UpsertRequest: WiredStream.UpsertRequest;
  }

  export interface Definition extends IngestBaseStream.Definition {
    ingest: WiredIngest;
  }

  export type Source = IngestBaseStream.Source<WiredStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    inherited_fields: InheritedFieldDefinition;
    effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
    effective_settings: WiredIngestStreamEffectiveSettings;
    effective_failure_store: WiredIngestStreamEffectiveFailureStore;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<
    OmitWiredStreamUpsertProps<Definition>
  >;
}

const WiredStreamSchema = {
  Definition: z.object({
    ingest: WiredIngest.right,
  }),
  Source: z.intersection(IngestBaseStream.Definition.right, z.object({})),
  GetResponse: z.intersection(
    IngestBaseStream.GetResponse.right,
    z.object({
      inherited_fields: inheritedFieldDefinitionSchema,
      effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
      effective_settings: wiredIngestStreamEffectiveSettingsSchema,
      effective_failure_store: wiredIngestStreamEffectiveFailureStoreSchema,
    })
  ),
  UpsertRequest: z.intersection(IngestBaseStream.UpsertRequest.right, z.object({})),
};
type IWiredStreamSchema = typeof WiredStreamSchema;

export const WiredStream: ModelValidation<BaseStream.Model, WiredStream.Model> = modelValidation<
  BaseStream.Model,
  IWiredStreamSchema,
  WiredStreamsDefaults
>(BaseStream, WiredStreamSchema);

// Optimized implementation for Definition check - the fallback is a zod-based check
WiredStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is WiredStream.Definition =>
  Boolean(
    'ingest' in stream &&
      typeof stream.ingest === 'object' &&
      stream.ingest &&
      'wired' in stream.ingest
  );
