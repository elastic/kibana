/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import { significantEventSchema } from '@kbn/significant-events-schema';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const EVENTS_DATA_STREAM = '.significant_events-events';

export const eventsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    event_uuid: mappings.keyword(),
    discovery_id: mappings.keyword(),
    event_id: mappings.keyword(),
    previous_event_uuid: mappings.keyword(),
    stream_names: mappings.keyword(),
    status: mappings.keyword(),
    severity: mappings.keyword(),
    title: mappings.text(),
    summary: mappings.text(),
  },
} satisfies MappingsDefinition;
export type StoredEvent = GetFieldsOf<typeof eventsMappings>;
export type { SignificantEvent };

/**
 * Stored form of a SignificantEvent document:
 * - `severity` is encoded as a sortable prefixed keyword (e.g. `"60-high"`)
 * - `stream_names` is derived from `signals[].stream_name` when not provided
 */
export const storedEventSchema = significantEventSchema.transform((doc) => ({
  ...doc,
  stream_names: doc.stream_names?.length
    ? doc.stream_names
    : [...new Set((doc.signals ?? []).map((s) => s.stream_name).filter(Boolean))],
}));

export const eventsDataStream: DataStreamDefinition<typeof eventsMappings, StoredEvent> = {
  name: EVENTS_DATA_STREAM,
  version: 7,
  hidden: true,
  template: {
    priority: 500,
    mappings: eventsMappings,
  },
};
