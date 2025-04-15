/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelValidation, joinValidation } from './validation';
import { base as nBase } from './base';
import { GroupStream as nGroupStream } from './group';
import { ingest as nIngest } from './ingest';
import { UnwiredStream as nUnwiredStream } from './ingest/unwired';
import { WiredStream as nWiredStream } from './ingest/wired';

/* eslint-disable @typescript-eslint/no-namespace */

export namespace Streams {
  export import base = nBase;

  export import ingest = nIngest;

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

  export const all: ModelValidation<base.Model, all.Model> = joinValidation(base, [
    ingest.all,
    GroupStream,
  ]);
}

Streams.base = nBase;
Streams.ingest = nIngest;
Streams.WiredStream = nWiredStream;
Streams.UnwiredStream = nUnwiredStream;
Streams.GroupStream = nGroupStream;
