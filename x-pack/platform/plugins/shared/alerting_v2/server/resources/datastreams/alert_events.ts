/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsDefinition } from '@kbn/es-mappings';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import { alertEventSeveritySchema } from '@kbn/alerting-v2-schemas';
import type { ResourceDefinition } from './types';

// v7: renames episode.* → alert.* and adds episode.* as alias fields for query compatibility.
// Clusters with pre-v7 data streams are wiped on startup (see DatastreamInitializer).
export const ALERT_EVENTS_DATA_STREAM_VERSION = 7;
export const ALERT_EVENTS_BACKING_INDEX = '.ds-.rule-events-*';

const mappings: MappingsDefinition = {
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
    // Renamed from `episode` in v7. New documents are written with `alert.*`.
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

const alertEventStatusSchema = z.enum(['breached', 'recovered', 'no_data']);
const alertEventTypeSchema = z.enum(['signal', 'alert']);
const alertEpisodeStatusSchema = z.enum(['inactive', 'pending', 'active', 'recovering']);
const alertEpisodeStatusCountSchema = z.number().int().optional();

export const alertEventStatus = alertEventStatusSchema.enum;
export const alertEventType = alertEventTypeSchema.enum;
export const alertEpisodeStatus = alertEpisodeStatusSchema.enum;

export const alertEventSchema = z.object({
  '@timestamp': z.string(),
  scheduled_timestamp: z.string().optional(),
  rule: z.object({ id: z.string().optional(), version: z.number().optional() }).optional(),
  group_hash: z.string(),
  data: z.record(z.string(), z.unknown()),
  status: alertEventStatusSchema,
  source: z.string(),
  type: alertEventTypeSchema,
  // Matches the `alert` mapping field (renamed from `episode` in v7).
  alert: z
    .object({
      id: z.string(),
      status: alertEpisodeStatusSchema,
      status_count: alertEpisodeStatusCountSchema,
    })
    .optional(),
  space_id: z.string(),
  severity: alertEventSeveritySchema.optional(),
});

export type AlertEvent = z.infer<typeof alertEventSchema>;
export type AlertEventStatus = z.infer<typeof alertEventStatusSchema>;
export type AlertEventType = z.infer<typeof alertEventTypeSchema>;
export type AlertEpisodeStatus = z.infer<typeof alertEpisodeStatusSchema>;

export const buildRuleEventDocument = (params: AlertEvent): AlertEvent => {
  const { scheduled_timestamp, alert, severity, ...required } = params;

  const doc: AlertEvent = { ...required };

  if (scheduled_timestamp !== undefined) {
    doc.scheduled_timestamp = scheduled_timestamp;
  }

  if (alert !== undefined) {
    doc.alert = {
      id: alert.id,
      status: alert.status,
      ...(alert.status_count != null ? { status_count: alert.status_count } : {}),
    };
  }

  if (severity !== undefined) {
    doc.severity = severity;
  }

  return doc;
};

export const getAlertEventsResourceDefinition = (): ResourceDefinition => ({
  key: `data_stream:${ALERT_EVENTS_DATA_STREAM}`,
  dataStreamName: ALERT_EVENTS_DATA_STREAM,
  version: ALERT_EVENTS_DATA_STREAM_VERSION,
  mappings,
  lifecycle: {},
  episodeToAlertMigration: true,
});
