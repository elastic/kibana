/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';

export const ROOT_STREAM_ID = '__ROOT__';

/**
 * Content packs bundle portable stream configuration only (routing, mappings,
 * processing, lifecycle). Significant-event queries are intentionally not part of
 * content packs; they are managed exclusively through the dedicated sig-events
 * `/api/streams/{name}/queries` endpoints. This type therefore matches the wired
 * stream upsert shape exactly.
 */
export type ContentPackStreamRequest = Streams.WiredStream.UpsertRequest;

export interface ContentPackStream {
  type: 'stream';
  name: string;
  request: ContentPackStreamRequest;
}
