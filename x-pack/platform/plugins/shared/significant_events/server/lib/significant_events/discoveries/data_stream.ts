/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import { discoverySchema } from '@kbn/significant-events-schema';
import type { Discovery } from '@kbn/significant-events-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const DISCOVERIES_DATA_STREAM = '.significant_events-discoveries';

export const discoveriesMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    kind: mappings.keyword(),
    discovery_id: mappings.keyword(),
    event_id: mappings.keyword(),
    stream_names: mappings.keyword(),
    severity: mappings.keyword(),
    signals: mappings.object({
      properties: {
        type: { type: 'keyword' as const },
        stream_name: { type: 'keyword' as const },
        confirmed: { type: 'boolean' as const },
        metadata: mappings.object({
          properties: {
            rule_uuid: { type: 'keyword' as const },
            detection_id: { type: 'keyword' as const },
          },
        }),
      },
    }),
    causal_features: mappings.object({
      properties: {
        feature_id: { type: 'keyword' as const },
        stream_name: { type: 'keyword' as const },
      },
    }),
  },
} satisfies MappingsDefinition;

export type StoredDiscovery = GetFieldsOf<typeof discoveriesMappings>;
export type { Discovery };

/**
 * Stored form of a Discovery document:
 * - `severity` is encoded as a sortable prefixed keyword (e.g. `"60-high"`)
 * - `stream_names` is derived from `signals[].stream_name` when not provided
 */
export const storedDiscoverySchema = discoverySchema.omit({ processed: true }).transform((doc) => ({
  ...doc,
  stream_names: doc.stream_names?.length
    ? doc.stream_names
    : [...new Set((doc.signals ?? []).map((s) => s.stream_name).filter(Boolean))],
}));

export const discoveriesDataStream: DataStreamDefinition<
  typeof discoveriesMappings,
  StoredDiscovery
> = {
  name: DISCOVERIES_DATA_STREAM,
  version: 5,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: discoveriesMappings,
  },
};
