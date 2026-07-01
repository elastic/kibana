/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsSetup } from '@kbn/core-data-streams-server';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';

/** The append-only data stream backing the Notification Center. */
export const NOTIFICATION_DATA_STREAM_NAME = '.kibana-notification-center' as const;

/**
 * Retention ceiling for the data stream. Finer per-severity TTLs are enforced
 * by the Notification Center cleanup task.
 */
export const NOTIFICATION_DATA_RETENTION = '180d' as const;

/**
 * Mappings for the notification data stream. Only fields queried against in ES
 * are mapped; display-only fields (`title`, `description`, `cta`) ride along in
 * `_source`. `dynamic: false` keeps the stream forward-compatible with fields
 * added by newer nodes — bump `version` to make a new field queryable.
 */
export const notificationDataStreamMappings = {
  dynamic: false,
  properties: {
    /** Ingest time; drives ordering and retention. */
    '@timestamp': mappings.date(),
    /** Deterministic idempotency key; collapse field at query time. */
    notification_id: mappings.keyword(),
    /** Time of the underlying notification event. */
    event_timestamp: mappings.date(),
    /** Registered notification type, e.g. `inferenceModelStatus`. */
    type: mappings.keyword(),
    /** App id of the producing application, e.g. `inference`. */
    source_app_id: mappings.keyword(),
    /** Severity tier; drives severity-based retention. */
    severity: mappings.keyword(),
  },
} satisfies MappingsDefinition;

/**
 * Installs the notification data stream's index template at plugin setup. The
 * data stream itself is created lazily by ES on the first write.
 */
export const registerNotificationDataStream = (dataStreams: DataStreamsSetup) => {
  return dataStreams.registerDataStream({
    name: NOTIFICATION_DATA_STREAM_NAME,
    version: 1,
    hidden: true,
    template: {
      priority: 500,
      lifecycle: {
        data_retention: NOTIFICATION_DATA_RETENTION,
      },
      mappings: notificationDataStreamMappings,
    },
  });
};
