/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { BaseStream } from '../base';
import { IngestBase, IngestBaseUpsertRequest } from './base';
import type { Validation } from '../validation/validation';
import { validation } from '../validation/validation';
import { ClassicIngest, ClassicIngestUpsertRequest, ClassicStream } from './classic';
import { WiredIngest, WiredIngestUpsertRequest, WiredStream } from './wired';
import { GraphIngest, GraphIngestUpsertRequest, GraphStream } from './graph';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace IngestStream {
  export namespace all {
    export type UpsertRequest =
      | WiredStream.UpsertRequest
      | ClassicStream.UpsertRequest
      | GraphStream.UpsertRequest;

    export type Source = WiredStream.Source | ClassicStream.Source | GraphStream.Source;
    export type Definition =
      | WiredStream.Definition
      | ClassicStream.Definition
      | GraphStream.Definition;
    export type GetResponse =
      | WiredStream.GetResponse
      | ClassicStream.GetResponse
      | GraphStream.GetResponse;

    export type Model = WiredStream.Model | ClassicStream.Model | GraphStream.Model;
  }

  const allDefinitionSchema = z.union([
    WiredStream.Definition.right,
    ClassicStream.Definition.right,
    GraphStream.Definition.right,
  ]);
  const allSourceSchema = z.union([
    WiredStream.Source.right,
    ClassicStream.Source.right,
    GraphStream.Source.right,
  ]);
  const allGetResponseSchema = z.union([
    WiredStream.GetResponse.right,
    ClassicStream.GetResponse.right,
    GraphStream.GetResponse.right,
  ]);
  const allUpsertRequestSchema = z.union([
    WiredStream.UpsertRequest.right,
    ClassicStream.UpsertRequest.right,
    GraphStream.UpsertRequest.right,
  ]);

  export const all: {
    Definition: Validation<BaseStream.Model['Definition'], IngestStream.all.Definition>;
    Source: Validation<BaseStream.Model['Definition'], IngestStream.all.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], IngestStream.all.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], IngestStream.all.UpsertRequest>;
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

  // Optimized implementation for Definition check - the fallback is a zod-based check
  all.Definition.is = (
    stream: BaseStream.Model['Definition']
  ): stream is IngestStream.all.Definition => 'ingest' in stream;

  // Optimized implementation for GetResponse check - avoids full DeepStrict Zod parse
  all.GetResponse.is = (
    response: BaseStream.Model['GetResponse']
  ): response is IngestStream.all.GetResponse =>
    'ingest' in response.stream &&
    'privileges' in response &&
    typeof response.privileges === 'object' &&
    response.privileges !== null &&
    'read_failure_store' in response.privileges &&
    'manage_failure_store' in response.privileges;
}

export type Ingest = WiredIngest | ClassicIngest | GraphIngest;
export const Ingest: Validation<IngestBase, Ingest> = validation(
  IngestBase.right,
  z.union([WiredIngest.right, ClassicIngest.right, GraphIngest.right])
);

export type IngestUpsertRequest =
  | WiredIngestUpsertRequest
  | ClassicIngestUpsertRequest
  | GraphIngestUpsertRequest;
export const IngestUpsertRequest: Validation<IngestBaseUpsertRequest, IngestUpsertRequest> =
  validation(
    IngestBaseUpsertRequest.right,
    z.union([WiredIngestUpsertRequest.right, ClassicIngestUpsertRequest.right, GraphIngestUpsertRequest.right])
  );

export { GraphIngest, GraphIngestUpsertRequest, GraphStream };
