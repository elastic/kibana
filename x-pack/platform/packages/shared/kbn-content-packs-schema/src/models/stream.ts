/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery, Streams } from '@kbn/streams-schema';

export const ROOT_STREAM_ID = '__ROOT__';

/**
 * Content packs bundle significant-event queries as portable content, so the
 * content-pack stream request retains `queries`. The stream CRUD `UpsertRequest`
 * intentionally omits `queries` (they are managed via the dedicated sig-events
 * `/queries` endpoints), so this type re-adds them on top of the wired upsert shape.
 */
export type ContentPackStreamRequest = Streams.WiredStream.UpsertRequest & {
  queries: StreamQuery[];
};

export interface ContentPackStream {
  type: 'stream';
  name: string;
  request: ContentPackStreamRequest;
}
