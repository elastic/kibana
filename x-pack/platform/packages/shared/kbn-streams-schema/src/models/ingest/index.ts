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

/* eslint-disable @typescript-eslint/no-namespace */
export namespace IngestStream {
  export namespace all {
    export type UpsertRequest = WiredStream.UpsertRequest | ClassicStream.UpsertRequest;

    export type Source = WiredStream.Source | ClassicStream.Source;
    export type Definition = WiredStream.Definition | ClassicStream.Definition;
    export type GetResponse = WiredStream.GetResponse | ClassicStream.GetResponse;

    export type Model = WiredStream.Model | ClassicStream.Model;
  }

  export const all: {
    Definition: Validation<BaseStream.Model['Definition'], IngestStream.all.Definition>;
    Source: Validation<BaseStream.Model['Definition'], IngestStream.all.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], IngestStream.all.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], IngestStream.all.UpsertRequest>;
  } = {
    Definition: validation(
      z.union([WiredStream.Definition.right, ClassicStream.Definition.right]) as z.Schema<
        BaseStream.Model['Definition']
      >,
      z.union([WiredStream.Definition.right, ClassicStream.Definition.right])
    ),
    Source: validation(
      z.union([WiredStream.Source.right, ClassicStream.Source.right]) as z.Schema<
        BaseStream.Model['Definition']
      >,
      z.union([WiredStream.Source.right, ClassicStream.Source.right])
    ),
    GetResponse: validation(
      z.union([WiredStream.GetResponse.right, ClassicStream.GetResponse.right]) as z.Schema<
        BaseStream.Model['GetResponse']
      >,
      z.union([WiredStream.GetResponse.right, ClassicStream.GetResponse.right])
    ),
    UpsertRequest: validation(
      z.union([WiredStream.UpsertRequest.right, ClassicStream.UpsertRequest.right]) as z.Schema<
        BaseStream.Model['UpsertRequest']
      >,
      z.union([WiredStream.UpsertRequest.right, ClassicStream.UpsertRequest.right])
    ),
  };

  // Optimized implementation for Definition check - the fallback is a zod-based check
  all.Definition.is = (
    stream: BaseStream.Model['Definition']
  ): stream is IngestStream.all.Definition => 'ingest' in stream;
}

export type Ingest = WiredIngest | ClassicIngest;
export const Ingest: Validation<IngestBase, Ingest> = validation(
  IngestBase.right,
  z.union([WiredIngest.right, ClassicIngest.right])
);

export type IngestUpsertRequest = WiredIngestUpsertRequest | ClassicIngestUpsertRequest;
export const IngestUpsertRequest: Validation<IngestBaseUpsertRequest, IngestUpsertRequest> =
  validation(
    IngestBaseUpsertRequest.right,
    z.union([WiredIngestUpsertRequest.right, ClassicIngestUpsertRequest.right])
  );
