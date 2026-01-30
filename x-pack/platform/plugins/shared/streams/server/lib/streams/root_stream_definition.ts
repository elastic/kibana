/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getSegments } from '@kbn/streams-schema';
import { baseFields } from './component_templates/logs_layer';

export const LOGS_ROOT_STREAM_NAME = 'logs';

export const createRootStreamDefinition = (): Streams.WiredStream.Definition => {
  const now = new Date().toISOString();

  return {
    name: LOGS_ROOT_STREAM_NAME,
    description: 'Root stream',
    updated_at: now,
    ingest: {
      lifecycle: { dsl: {} },
      failure_store: {
        lifecycle: { enabled: { data_retention: '30d' } }, // default 30d retention for failure store
      },
      settings: {},
      processing: { steps: [], updated_at: now },
      wired: {
        routing: [],
        fields: {
          ...baseFields,
        },
      },
    },
  };
};

export function hasSupportedStreamsRoot(streamName: string) {
  const root = getSegments(streamName)[0];
  return [LOGS_ROOT_STREAM_NAME].includes(root);
}
