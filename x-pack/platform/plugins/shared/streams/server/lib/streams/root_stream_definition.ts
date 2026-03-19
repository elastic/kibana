/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  LOGS_ECS_STREAM_NAME,
  LOGS_ROOT_STREAM_NAME,
  ROOT_STREAM_NAMES,
} from '@kbn/streams-schema';
import { baseFields } from './component_templates/logs_layer';
import { ecsBaseFields } from './component_templates/logs_ecs_layer';

export const createRootStreamDefinition = (
  streamName: string = LOGS_ROOT_STREAM_NAME
): Streams.WiredStream.Definition => {
  const now = new Date().toISOString();

  return {
    name: streamName,
    description: `Root stream for ${streamName}`,
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
        fields: streamName === LOGS_ECS_STREAM_NAME ? ecsBaseFields : baseFields,
      },
    },
  };
};

export function hasSupportedStreamsRoot(streamName: string): boolean {
  return ROOT_STREAM_NAMES.some((root) => streamName === root || streamName.startsWith(`${root}.`));
}
