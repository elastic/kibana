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
  ingestBaseSchemaFields,
  ingestBaseUpsertSchemaFields,
  ingestBaseStreamDefinitionSchema,
  ingestBaseStreamGetResponseSchema,
  ingestBaseStreamUpsertDefinitionSchema,
  ingestBaseStreamUpsertRequestSchema,
} from './base';
import type { RoutingDefinition } from './routing';
import { routingDefinitionListSchema } from './routing';
import type { WiredIngestStreamEffectiveLifecycle } from './lifecycle';
import { wiredIngestStreamEffectiveLifecycleSchema } from './lifecycle';
import type { FieldDefinition, InheritedFieldDefinition } from '../../fields';
import { fieldDefinitionSchema, inheritedFieldDefinitionSchema } from '../../fields';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { BaseStream } from '../base';
import type { WiredIngestStreamEffectiveSettings } from './settings';
import { wiredIngestStreamEffectiveSettingsSchema } from './settings';
import type { WiredIngestStreamEffectiveFailureStore } from './failure_store';
import { wiredIngestStreamEffectiveFailureStoreSchema } from './failure_store';

/* eslint-disable @typescript-eslint/no-namespace */

interface IngestWired {
  wired: {
    fields: FieldDefinition;
    routing: RoutingDefinition[];
    draft?: boolean;
  };
}

const ingestWiredShape = {
  wired: z.object({
    fields: fieldDefinitionSchema,
    routing: routingDefinitionListSchema,
    draft: z.boolean().optional(),
  }),
};

export type WiredIngest = IngestBase & IngestWired;

const wiredIngestSchemaObject = z.object({
  ...ingestBaseSchemaFields,
  ...ingestWiredShape,
});

export const WiredIngest: Validation<IngestBase, WiredIngest> = validation(
  IngestBase.right,
  wiredIngestSchemaObject
);

export type WiredIngestUpsertRequest = IngestBaseUpsertRequest & IngestWired;

const wiredIngestUpsertSchemaObject = z.object({
  ...ingestBaseUpsertSchemaFields,
  ...ingestWiredShape,
});

export const WiredIngestUpsertRequest: Validation<
  IngestBaseUpsertRequest,
  WiredIngestUpsertRequest
> = validation(IngestBaseUpsertRequest.right, wiredIngestUpsertSchemaObject);

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

export namespace WiredStream {
  export interface Model {
    Definition: WiredStream.Definition;
    Source: WiredStream.Source;
    GetResponse: WiredStream.GetResponse;
    UpsertRequest: WiredStream.UpsertRequest;
  }

  export interface Definition extends IngestBaseStream.Definition {
    type: 'wired';
    ingest: WiredIngest;
  }

  export type Source = IngestBaseStream.Source<WiredStream.Definition>;

  export interface GetResponse extends IngestBaseStream.GetResponse<Definition> {
    /**
     * Whether the backing data stream exists in Elasticsearch.
     *
     * Note: when the caller lacks `view_index_metadata`, this will be `false`
     * (consistent with classic streams).
     */
    data_stream_exists: boolean;
    inherited_fields: InheritedFieldDefinition;
    effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
    effective_settings: WiredIngestStreamEffectiveSettings;
    effective_failure_store: WiredIngestStreamEffectiveFailureStore;
  }

  export type UpsertRequest = IngestBaseStream.UpsertRequest<
    OmitWiredStreamUpsertProps<Definition>
  >;
}

const wiredStreamDefinitionSchema = ingestBaseStreamDefinitionSchema
  .extend({
    type: z.literal('wired'),
    ingest: wiredIngestSchemaObject,
  })
  .meta({ id: 'WiredStreamDefinition' });

const wiredStreamGetResponseSchema = ingestBaseStreamGetResponseSchema
  .extend({
    stream: wiredStreamDefinitionSchema,
    data_stream_exists: z.boolean(),
    inherited_fields: inheritedFieldDefinitionSchema,
    effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
    effective_settings: wiredIngestStreamEffectiveSettingsSchema,
    effective_failure_store: wiredIngestStreamEffectiveFailureStoreSchema,
  })
  .meta({ id: 'WiredStreamGetResponse' });

const wiredStreamUpsertRequestSchema = ingestBaseStreamUpsertRequestSchema
  .extend({
    stream: ingestBaseStreamUpsertDefinitionSchema.extend({
      type: z.literal('wired'),
      ingest: wiredIngestUpsertSchemaObject,
    }),
  })
  .meta({ id: 'WiredStreamUpsertRequest' });

export const WiredStream: {
  Definition: Validation<BaseStream.Model['Definition'], WiredStream.Definition>;
  Source: Validation<BaseStream.Model['Definition'], WiredStream.Source>;
  GetResponse: Validation<BaseStream.Model['GetResponse'], WiredStream.GetResponse>;
  UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], WiredStream.UpsertRequest>;
} = {
  Definition: validation(
    wiredStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    wiredStreamDefinitionSchema
  ),
  Source: validation(
    wiredStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    wiredStreamDefinitionSchema
  ),
  GetResponse: validation(
    wiredStreamGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
    wiredStreamGetResponseSchema
  ),
  UpsertRequest: validation(
    wiredStreamUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
    wiredStreamUpsertRequestSchema
  ),
};

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
