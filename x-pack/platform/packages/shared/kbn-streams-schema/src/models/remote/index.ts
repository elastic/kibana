/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { BaseStream } from '../base';
import {
  baseStreamDefinitionSchema,
  baseStreamGetResponseSchema,
  baseStreamUpsertRequestSchema,
  baseStreamUpsertDefinitionSchema,
} from '../base';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import type { InheritedFieldDefinition } from '../../fields';
import { inheritedFieldDefinitionSchema } from '../../fields';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace RemoteStream {
  export interface Model {
    Definition: RemoteStream.Definition;
    Source: RemoteStream.Source;
    GetResponse: RemoteStream.GetResponse;
    UpsertRequest: RemoteStream.UpsertRequest;
  }

  export interface Definition extends BaseStream.Definition {
    type: 'remote';
    /**
     * The index pattern on the remote cluster that this stream reads from.
     * Defaults to the stream name when not provided.
     */
    remote_index_pattern?: string;
  }

  export type Source = BaseStream.Source<RemoteStream.Definition>;

  export interface GetResponse extends BaseStream.GetResponse<Definition> {
    stream: Definition;
    inherited_fields: InheritedFieldDefinition;
  }

  export interface UpsertRequest extends BaseStream.UpsertRequest<Definition> {
    stream: Omit<BaseStream.UpsertRequest<Definition>['stream'], 'remote_index_pattern'> & {
      remote_index_pattern?: string;
    };
  }
}

const remoteStreamDefinitionSchema = baseStreamDefinitionSchema
  .extend({
    type: z.literal('remote'),
    remote_index_pattern: z.string().optional(),
  })
  .meta({ id: 'RemoteStreamDefinition' });

const remoteStreamGetResponseSchema = baseStreamGetResponseSchema
  .extend({
    stream: remoteStreamDefinitionSchema,
    inherited_fields: inheritedFieldDefinitionSchema,
  })
  .meta({ id: 'RemoteStreamGetResponse' });

const remoteStreamUpsertRequestSchema = baseStreamUpsertRequestSchema
  .extend({
    stream: baseStreamUpsertDefinitionSchema.extend({
      type: z.literal('remote'),
      remote_index_pattern: z.string().optional(),
    }),
  })
  .meta({ id: 'RemoteStreamUpsertRequest' });

export const RemoteStream: {
  Definition: Validation<BaseStream.Model['Definition'], RemoteStream.Definition>;
  Source: Validation<BaseStream.Model['Definition'], RemoteStream.Source>;
  GetResponse: Validation<BaseStream.Model['GetResponse'], RemoteStream.GetResponse>;
  UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], RemoteStream.UpsertRequest>;
} = {
  Definition: validation(
    remoteStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    remoteStreamDefinitionSchema
  ),
  Source: validation(
    remoteStreamDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
    remoteStreamDefinitionSchema
  ),
  GetResponse: validation(
    remoteStreamGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
    remoteStreamGetResponseSchema
  ),
  UpsertRequest: validation(
    remoteStreamUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
    remoteStreamUpsertRequestSchema
  ),
};

// Optimized implementation for Definition check
RemoteStream.Definition.is = (
  stream: BaseStream.Model['Definition']
): stream is RemoteStream.Definition => (stream as RemoteStream.Definition).type === 'remote';
