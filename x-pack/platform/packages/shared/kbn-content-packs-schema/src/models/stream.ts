/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';

export const ROOT_STREAM_ID = '__root__';

export interface ContentPackStream {
  type: 'stream';
  name: string;
  request: Streams.WiredStream.UpsertRequest;
}
