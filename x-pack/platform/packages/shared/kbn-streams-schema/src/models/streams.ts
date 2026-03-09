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

  export const all: {
    Definition: Validation<BaseStream.Model['Definition'], all.Definition>;
    Source: Validation<BaseStream.Model['Definition'], all.Source>;
    GetResponse: Validation<BaseStream.Model['GetResponse'], all.GetResponse>;
    UpsertRequest: Validation<BaseStream.Model['UpsertRequest'], all.UpsertRequest>;
  } = {
    Definition: validation(
      z.union([
        nWiredStream.Definition.right,
        nClassicStream.Definition.right,
        nQueryStream.Definition.right,
      ]) as z.Schema<BaseStream.Model['Definition']>,
      z.union([
        nWiredStream.Definition.right,
        nClassicStream.Definition.right,
        nQueryStream.Definition.right,
      ])
    ),
    Source: validation(
      z.union([
        nWiredStream.Source.right,
        nClassicStream.Source.right,
        nQueryStream.Source.right,
      ]) as z.Schema<BaseStream.Model['Definition']>,
      z.union([nWiredStream.Source.right, nClassicStream.Source.right, nQueryStream.Source.right])
    ),
    GetResponse: validation(
      z.union([
        nWiredStream.GetResponse.right,
        nClassicStream.GetResponse.right,
        nQueryStream.GetResponse.right,
      ]) as z.Schema<BaseStream.Model['GetResponse']>,
      z.union([
        nWiredStream.GetResponse.right,
        nClassicStream.GetResponse.right,
        nQueryStream.GetResponse.right,
      ])
    ),
    UpsertRequest: validation(
      z.union([
        nWiredStream.UpsertRequest.right,
        nClassicStream.UpsertRequest.right,
        nQueryStream.UpsertRequest.right,
      ]) as z.Schema<BaseStream.Model['UpsertRequest']>,
      z.union([
        nWiredStream.UpsertRequest.right,
        nClassicStream.UpsertRequest.right,
        nQueryStream.UpsertRequest.right,
      ])
    ),
  };
}

Streams.ingest = IngestStream;
Streams.WiredStream = nWiredStream;
Streams.ClassicStream = nClassicStream;
Streams.QueryStream = nQueryStream;
