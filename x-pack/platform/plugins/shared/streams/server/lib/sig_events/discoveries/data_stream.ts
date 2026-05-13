/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { Discovery } from '@kbn/streams-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const DISCOVERIES_DATA_STREAM = '.significant_events-discoveries';

export const discoveriesMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    status: mappings.keyword(),
    discovery_id: mappings.keyword(),
    discovery_slug: mappings.keyword(),
    rule_names: mappings.keyword(),
    stream_names: mappings.keyword(),
    grouped_discovery_ids: mappings.keyword(),
    title: mappings.text({
      fields: {
        keyword: { type: 'keyword', ignore_above: 512 },
      },
    }),
    summary: mappings.text(),
    root_cause: mappings.text(),
    detections: mappings.object({
      properties: {
        rule_uuid: mappings.keyword(),
      },
    }),
  },
} satisfies MappingsDefinition;

export type StoredDiscovery = GetFieldsOf<typeof discoveriesMappings>;
export type { Discovery };

export const discoveriesDataStream: DataStreamDefinition<
  typeof discoveriesMappings,
  StoredDiscovery
> = {
  name: DISCOVERIES_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: discoveriesMappings,
  },
};
