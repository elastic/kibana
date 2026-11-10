/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Both streams are system data streams owned by Elasticsearch, which creates each one on its first
// write. Their mappings, settings and retention live in `context-engine-session-*.json` in the
// Elasticsearch Kibana module, so Kibana registers no template for them.

export const SESSION_MEMORY_DATA_STREAM = '.context-engine-session-memory';
export const SESSION_EVENTS_DATA_STREAM = '.context-engine-session-events';
