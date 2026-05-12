/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { SigEvent } from '@kbn/streams-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const EVENTS_DATA_STREAM = '.significant_events-events';

export const eventsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    verdict: mappings.keyword(),
    event_id: mappings.keyword(),
    discovery_id: mappings.keyword(),
    discovery_slug: mappings.keyword(),
    grouped_into: mappings.keyword(),
    last_reviewed_at: mappings.date({ format: 'strict_date_optional_time' }),
    rule_names: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type StoredEvent = GetFieldsOf<typeof eventsMappings>;
export type { SigEvent };

export const eventsDataStream: DataStreamDefinition<typeof eventsMappings, StoredEvent> = {
  name: EVENTS_DATA_STREAM,
  version: 3,
  hidden: true,
  template: {
    priority: 500,
    mappings: eventsMappings,
  },
};
