/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getSegments } from '@kbn/streams-schema';
import { baseFields } from './component_templates/logs_layer';

export const LOGS_ROOT_STREAM_NAME = 'logs';

export const rootStreamDefinition: Streams.WiredStream.Definition = {
  name: LOGS_ROOT_STREAM_NAME,
  description: 'Root stream',
  ingest: {
    lifecycle: { dsl: {} },
    processing: [],
    wired: {
      routing: [],
      fields: {
        ...baseFields,
      },
    },
  },
};

export function hasSupportedStreamsRoot(streamName: string) {
  const root = getSegments(streamName)[0];
  return [LOGS_ROOT_STREAM_NAME].includes(root);
}
