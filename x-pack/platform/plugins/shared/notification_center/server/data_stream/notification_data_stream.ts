/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataStreamsSetup,
  DataStreamsStart,
  IDataStreamClient,
} from '@kbn/core-data-streams-server';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import type { Notification } from '../../common/types';

/** The append-only data stream backing the Notification Center. */
export const NOTIFICATION_DATA_STREAM_NAME = '.kibana-notification-center' as const;

/**
 * Retention ceiling for the data stream. Finer per-severity TTLs are enforced
 * by the Notification Center cleanup task.
 */
export const NOTIFICATION_DATA_RETENTION = '180d' as const;

/**
 * Mappings for the notification data stream. Only fields being queried
 * are mapped; display-only fields (`title`, `description`, `cta`) stay in
 * `_source`.
 */
export const notificationDataStreamMappings = {
  // keep the stream forward-compatible
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
    // bump version to make a new field queryable.
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

/**
 * A data stream client whose document type is the canonical {@link Notification}
 * (the zod schema is the source of truth). Binding the mappings and the schema
 * type here forces `Notification` to satisfy the mapping's field contract at
 * compile time — the write path in #14979 relies on this coupling.
 */
export type NotificationDataStreamClient = IDataStreamClient<
  typeof notificationDataStreamMappings,
  Notification
>;

/**
 * Resolves the notification data stream client at start/request time. The write
 * and read logic that uses it lands in #14979 / #14980.
 */
export const getNotificationDataStreamClient = (
  dataStreams: DataStreamsStart
): Promise<NotificationDataStreamClient> =>
  dataStreams.initializeClient<typeof notificationDataStreamMappings, Notification>(
    NOTIFICATION_DATA_STREAM_NAME
  );
