/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsDefinition } from '@kbn/es-mappings';

/**
 * Mappings of the `.rule-events` data stream. Changing them requires bumping
 * `ALERT_EVENTS_DATA_STREAM_VERSION`, which stays in the `alerting_v2` plugin next to the
 * resource definition that applies these mappings.
 */
export const ALERT_EVENTS_MAPPINGS: MappingsDefinition = {
  dynamic: false,
  properties: {
    // Document '_id' is used as the unique alert event identifier
    '@timestamp': { type: 'date' },
    scheduled_timestamp: { type: 'date' },
    rule: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        version: { type: 'long' },
      },
    },
    group_hash: { type: 'keyword' },
    data: { type: 'flattened' },
    status: { type: 'keyword' }, // breached | recovered | no_data
    source: { type: 'keyword' },
    type: { type: 'keyword' }, // signal | alert
    // Renamed from `episode` in v8. New documents are written with `alert.*`.
    // The `episode.*` aliases allow existing ES|QL queries to keep using the old names
    // during the transition; they resolve to `alert.*` at query time.
    alert: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        status: { type: 'keyword' }, // inactive | pending | active | recovering
        status_count: { type: 'long' }, // only set for pending and recovering
      },
    },
    episode: {
      type: 'object',
      properties: {
        id: { type: 'alias', path: 'alert.id' },
        status: { type: 'alias', path: 'alert.status' },
        status_count: { type: 'alias', path: 'alert.status_count' },
      },
    },
    space_id: { type: 'keyword' },
    severity: { type: 'keyword' }, // info | low | medium | high | critical
  },
};
