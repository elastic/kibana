/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelValidation } from './validation/model_validation';
import { joinValidation } from './validation/model_validation';
import { BaseStream } from './base';
import { QueryStream as nQueryStream } from './query';
import { IngestStream } from './ingest';
import { ClassicStream as nClassicStream } from './ingest/classic';
import { WiredStream as nWiredStream } from './ingest/wired';

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

  export const all: ModelValidation<BaseStream.Model, all.Model> = joinValidation(BaseStream, [
    ingest.all,
    QueryStream,
  ]);
}

Streams.ingest = IngestStream;
Streams.WiredStream = nWiredStream;
Streams.ClassicStream = nClassicStream;
Streams.QueryStream = nQueryStream;
