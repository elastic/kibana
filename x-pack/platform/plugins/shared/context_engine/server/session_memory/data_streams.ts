/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsSetup } from '@kbn/core-data-streams-server';
import type { DataStreamDefinition } from '@kbn/data-streams';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';

/** Memories an agent chose to keep, one document per remember call. */
export const SESSION_MEMORY_DATA_STREAM = '.context-engine-session-memory';

/** Raw turn transcripts, one document per saveEvent call. */
export const SESSION_EVENTS_DATA_STREAM = '.context-engine-session-events';

const PRIORITY = 500;
const RETENTION = { data_retention: '90d' };
const NEWEST_FIRST = { index: { sort: { field: '@timestamp', order: 'desc' as const } } };

export const sessionMemoryMappings = {
  dynamic: 'strict',
  properties: {
    '@timestamp': mappings.date(),
    id: mappings.keyword(),
    space: mappings.keyword(),
    ai_index_id: mappings.keyword(),
    session_id: mappings.keyword(),
    user_id: mappings.keyword(),
    // A plain object, because `mappings.text()` always adds a `.keyword` subfield.
    content: { type: 'text', fields: { semantic_text: { type: 'semantic_text' } } },
    attributes: mappings.flattened(),
    deleted_at: mappings.date(),
  },
} satisfies MappingsDefinition;

export const sessionEventsMappings = {
  dynamic: 'strict',
  properties: {
    '@timestamp': mappings.date(),
    id: mappings.keyword(),
    space: mappings.keyword(),
    ai_index_id: mappings.keyword(),
    session_id: mappings.keyword(),
    turn_id: mappings.keyword(),
    user_id: mappings.keyword(),
    // Transcripts are read back by session, never searched, so they are kept in _source only.
    transcript: { type: 'text', index: false },
  },
} satisfies MappingsDefinition;

// Increment `version` on any change to a definition, or the updated template is never applied.
export const sessionMemoryDataStream: DataStreamDefinition<typeof sessionMemoryMappings> = {
  name: SESSION_MEMORY_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: PRIORITY,
    mappings: sessionMemoryMappings,
    settings: NEWEST_FIRST,
    lifecycle: RETENTION,
  },
};

export const sessionEventsDataStream: DataStreamDefinition<typeof sessionEventsMappings> = {
  name: SESSION_EVENTS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: PRIORITY,
    mappings: sessionEventsMappings,
    settings: NEWEST_FIRST,
    lifecycle: RETENTION,
  },
};

/** Registers both session memory data streams; Elasticsearch creates each on first use. */
export const registerSessionMemoryDataStreams = (dataStreams: DataStreamsSetup): void => {
  dataStreams.registerDataStream(sessionMemoryDataStream);
  dataStreams.registerDataStream(sessionEventsDataStream);
};
