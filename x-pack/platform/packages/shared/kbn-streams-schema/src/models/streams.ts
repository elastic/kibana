/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelValidation, joinValidation } from './validation/model_validation';
import { BaseStream } from './base';
import { GroupStream as nGroupStream } from './group';
import { IngestStream } from './ingest';
import { UnwiredStream as nUnwiredStream } from './ingest/unwired';
import { WiredStream as nWiredStream } from './ingest/wired';

/* eslint-disable @typescript-eslint/no-namespace */

export namespace Streams {
  export import ingest = IngestStream;

  export import WiredStream = nWiredStream;
  export import UnwiredStream = nUnwiredStream;
  export import GroupStream = nGroupStream;

  export namespace all {
    export type Model = ingest.all.Model | GroupStream.Model;
    export type Source = ingest.all.Source | GroupStream.Source;
    export type Definition = ingest.all.Definition | GroupStream.Definition;
    export type GetResponse = ingest.all.GetResponse | GroupStream.GetResponse;
    export type UpsertRequest = ingest.all.UpsertRequest | GroupStream.UpsertRequest;
  }

  export const all: ModelValidation<BaseStream.Model, all.Model> = joinValidation(BaseStream, [
    ingest.all,
    GroupStream,
  ]);
}

Streams.ingest = IngestStream;
Streams.WiredStream = nWiredStream;
Streams.UnwiredStream = nUnwiredStream;
Streams.GroupStream = nGroupStream;
