/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentPackHeader } from '@kbn/streams-schema';
import { concatStreamProviders, createIntersperseStream, createMapStream } from '@kbn/utils';
import { PassThrough, Readable } from 'stream';

export function createContentPack(...sources: Readable[]): Readable {
  return concatStreamProviders(
    [
      () => Readable.from([{ content_pack_version: 'v1' } as ContentPackHeader]),
      ...sources.map((source) => () => source),
    ],
    { objectMode: true }
  )
    .pipe(createMapStream((object) => JSON.stringify(object)))
    .pipe(createIntersperseStream('\n'))
    .pipe(new PassThrough({ objectMode: false }));
}
