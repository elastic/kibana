/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition, getSegments } from '@kbn/streams-schema';

export const LOGS_ROOT_STREAM_NAME = 'logs';

export const rootStreamDefinition: WiredStreamDefinition = {
  name: LOGS_ROOT_STREAM_NAME,
  ingest: {
    lifecycle: { dsl: {} },
    processing: [],
    routing: [],
    wired: {
      fields: {
        '@timestamp': {
          type: 'date',
        },
        message: {
          type: 'match_only_text',
        },
        'host.name': {
          type: 'keyword',
        },
        'log.level': {
          type: 'keyword',
        },
        'stream.name': {
          type: 'keyword',
        },
      },
    },
  },
};

export function hasSupportedStreamsRoot(streamName: string) {
  const root = getSegments(streamName)[0];
  return [LOGS_ROOT_STREAM_NAME].includes(root);
}
