/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Validation } from './validation/validation';
import { validation } from './validation/validation';
import type { BaseStream } from './base';
import { IngestStream } from './ingest';
import { ClassicStream as nClassicStream } from './ingest/classic';
import { WiredStream as nWiredStream } from './ingest/wired';
import { QueryStream as nQueryStream } from './query';

/* eslint-disable @typescript-eslint/no-namespace */

export namespace Streams {
  export import ingest = IngestStream;

  export import WiredStream = nWiredStream;
  export import ClassicStream = nClassicStream;
  export import QueryStream = nQueryStream;

  export namespace all {
    export type Model = ingest.all.Model | QueryStream.Model;
    export type Source = ingest.all.Source | QueryStream.Source;
    export type Definition = ingest.all.Definition | QueryStream.Definition;
    export type GetResponse = ingest.all.GetResponse | QueryStream.GetResponse;
    export type UpsertRequest = ingest.all.UpsertRequest | QueryStream.UpsertRequest;
  }

  const allDefinitionSchema = z.union([
    nWiredStream.Definition.right,
    nClassicStream.Definition.right,
    nQueryStream.Definition.right,
  ]);
  const allSourceSchema = z.union([
    nWiredStream.Source.right,
    nClassicStream.Source.right,
    nQueryStream.Source.right,
  ]);
  const allGetResponseSchema = z
    .union([
      nWiredStream.GetResponse.right,
      nClassicStream.GetResponse.right,
      nQueryStream.GetResponse.right,
    ])
    .meta({ id: 'StreamGetResponse' });
  const allUpsertRequestSchema = z
    .union([
      nWiredStream.UpsertRequest.right,
      nClassicStream.UpsertRequest.right,
      nQueryStream.UpsertRequest.right,
    ])
    .meta({ id: 'StreamUpsertRequest' });

  export const all: {
    Definition: Validation<BaseStream.Model['Definition'], all.Definition>;
    Source: Validation<BaseStream.Model['Definition'], all.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], all.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], all.UpsertRequest>;
  } = {
    Definition: validation(
      allDefinitionSchema as z.Schema<BaseStream.Model['Definition']>,
      allDefinitionSchema
    ),
    Source: validation(
      allSourceSchema as z.Schema<BaseStream.Model['Definition']>,
      allSourceSchema
    ),
    GetResponse: validation(
      allGetResponseSchema as z.Schema<BaseStream.Model['GetResponse']>,
      allGetResponseSchema
    ),
    UpsertRequest: validation(
      allUpsertRequestSchema as z.Schema<BaseStream.Model['UpsertRequest']>,
      allUpsertRequestSchema
    ),
  };
}

Streams.ingest = IngestStream;
Streams.WiredStream = nWiredStream;
Streams.ClassicStream = nClassicStream;
Streams.QueryStream = nQueryStream;

/**
 * Union of all three stream definition schemas, discriminated by the `type`
 * literal field. Registered as a named OAS component (`StreamDefinition`) with
 * a `discriminator` extension so code generators can produce properly typed
 * sealed-class / tagged-union structs.
 */
export const streamDefinitionSchema = z
  .union([
    nWiredStream.Definition.right,
    nClassicStream.Definition.right,
    nQueryStream.Definition.right,
  ])
  .meta({
    id: 'StreamDefinition',
    openapi: {
      discriminator: {
        propertyName: 'type',
        mapping: {
          wired: '#/components/schemas/WiredStreamDefinition',
          classic: '#/components/schemas/ClassicStreamDefinition',
          query: '#/components/schemas/QueryStreamDefinition',
        },
      },
    },
  });
