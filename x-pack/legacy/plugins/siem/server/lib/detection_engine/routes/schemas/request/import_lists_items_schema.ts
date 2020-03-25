/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';
import { Readable } from 'stream';

import { file } from '../common/schemas';

export const importListsItemsSchema = t.exact(
  t.type({
    file,
  })
);

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

/**
 * Special interface since we are streaming in a file through a reader
 */
export interface ImportListsItemsSchema {
  file: HapiReadableStream;
}
