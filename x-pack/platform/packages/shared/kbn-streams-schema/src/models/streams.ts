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

// Namespace aliases for the sub-streams. Babel elides this whole declaration
// (every member is an import alias or type-only), emitting NO runtime code, so
// these are type-only in the built CJS and the runtime values are assigned at
// the bottom of the file. It must stay separate from the `all` runtime member:
// `@babel/plugin-transform-typescript` >= 7.25 mis-compiles `export import X = Y`
// in a namespace that also has a runtime member, emitting an invalid nested
// `export var X` that is a SyntaxError in the built CJS.
// See: https://github.com/babel/babel/pull/16566
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
}

// Second, merged declaration holding the only runtime member, kept apart from the
// `export import` aliases above so Babel does not mis-compile them (see note there).
// Reference the imported bindings directly rather than the `ingest`/`GroupStream`
// aliases: the aliases emit no runtime code, so inside this block's compiled IIFE
// they are undefined, whereas the module imports are always in scope.
export namespace Streams {
  export const all: ModelValidation<BaseStream.Model, all.Model> = joinValidation(BaseStream, [
    IngestStream.all,
    nGroupStream,
  ]);
}

// Runtime values for the aliases above, which Babel drops (see the note there).
// `satisfies` keeps them type-checked against the namespace's alias types.
Object.assign(Streams, {
  ingest: IngestStream,
  WiredStream: nWiredStream,
  UnwiredStream: nUnwiredStream,
  GroupStream: nGroupStream,
} satisfies Pick<typeof Streams, 'ingest' | 'WiredStream' | 'UnwiredStream' | 'GroupStream'>);
