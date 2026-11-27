/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A system data stream owned by Elasticsearch, which creates it on the first write. Its mapping,
// settings and retention live in `context-engine-session-events.json` in the Elasticsearch Kibana
// module, so Kibana registers no template for it.
export const SESSION_EVENTS_DATA_STREAM = '.context-engine-session-events';
