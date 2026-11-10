/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Both streams are system data streams owned by Elasticsearch: the `SystemDataStreamDescriptor`s in the
// Elasticsearch Kibana module carry their mappings, settings and retention, and Elasticsearch creates each
// stream on its first write. Kibana registers nothing, because a template here could only drift from the
// descriptor. Changing a mapping means changing `context-engine-session-*.json` in Elasticsearch.

/** Memories an agent chose to keep, one document per remember call. */
export const SESSION_MEMORY_DATA_STREAM = '.context-engine-session-memory';

/** Raw turn transcripts, one document per saveEvent call. */
export const SESSION_EVENTS_DATA_STREAM = '.context-engine-session-events';
