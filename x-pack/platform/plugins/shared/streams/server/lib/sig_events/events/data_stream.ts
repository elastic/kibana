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
    event_id: mappings.keyword(),
    discovery_id: mappings.keyword(),
    discovery_slug: mappings.keyword(),
    previous_event_id: mappings.keyword(),
    stream_names: mappings.keyword(),
    rule_names: mappings.keyword(),
    verdict: mappings.keyword(),
    verdict_summary: mappings.text(),
    assessment_note: mappings.text(),
    verdict_source: mappings.keyword(),
    original_verdict: mappings.keyword(),
    conversation_id: mappings.keyword(),
    grouped_discovery_ids: mappings.keyword(),
    impact: mappings.keyword(),
    criticality: mappings.integer(),
    confidence: mappings.integer(),
    title: mappings.text(),
    summary: mappings.text(),
    root_cause: mappings.text(),
    recommended_action: mappings.text(),
    recommendations: mappings.text(),
    workflow_execution_id: mappings.keyword(),
    created_at: mappings.date({ format: 'strict_date_optional_time' }),
    grouped_into: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type StoredEvent = GetFieldsOf<typeof eventsMappings>;
export type { SigEvent };

export const eventsDataStream: DataStreamDefinition<typeof eventsMappings, StoredEvent> = {
  name: EVENTS_DATA_STREAM,
  version: 4,
  hidden: true,
  template: {
    priority: 500,
    mappings: eventsMappings,
  },
};
