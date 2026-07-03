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

/** Retention ceiling; per-severity TTLs are enforced by the cleanup task. */
export const NOTIFICATION_DATA_RETENTION = '180d' as const;

/** Only queried fields are mapped; `title`/`description`/`cta` stay in `_source`. */
export const notificationDataStreamMappings = {
  // keep the stream forward-compatible with fields added by newer nodes
  dynamic: false,
  properties: {
    /** Ingest time, stamped on write by NC — never producer-supplied. */
    '@timestamp': mappings.date(),
    /** Idempotency key; the collapse field at query time. */
    notification_id: mappings.keyword(),
    event_timestamp: mappings.date(),
    type: mappings.keyword(),
    source_app_id: mappings.keyword(),
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
    // bump on any mapping or lifecycle change
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
 * Data stream client typed with the canonical {@link Notification}; binding the
 * schema type to the mappings enforces their field contract at compile time.
 */
export type NotificationDataStreamClient = IDataStreamClient<
  typeof notificationDataStreamMappings,
  Notification
>;

/** Resolves the core-cached client. Call at the ES-operation site, not once up front. */
export const getNotificationDataStreamClient = (
  dataStreams: DataStreamsStart
): Promise<NotificationDataStreamClient> =>
  dataStreams.initializeClient<typeof notificationDataStreamMappings, Notification>(
    NOTIFICATION_DATA_STREAM_NAME
  );
