/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPackStream } from '@kbn/content-packs-schema';
import {
  emptyAssets,
  type FieldDefinition,
  type RoutingDefinition,
  type StreamQuery,
} from '@kbn/streams-schema';

export const testContentPackEntry = ({
  name,
  fields = {},
  routing = [],
  queries = [],
}: {
  name: string;
  fields?: FieldDefinition;
  routing?: RoutingDefinition[];
  queries?: StreamQuery[];
}): ContentPackStream => ({
  type: 'stream' as const,
  name,
  request: {
    ...emptyAssets,
    queries,
    stream: {
      description: '',
      ingest: {
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        wired: { routing, fields },
        settings: {},
      },
      updated_at: new Date().toISOString(),
    },
  },
});
