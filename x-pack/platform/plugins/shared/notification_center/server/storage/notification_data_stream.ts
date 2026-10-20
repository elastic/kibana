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
import type { DataStreamDefinition } from '@kbn/data-streams';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import type { Notification } from '../../common/types';

/** The append-only data stream backing the Notification Center. */
export const NOTIFICATION_DATA_STREAM_NAME = '.kibana-notifications' as const;

/** Retention ceiling; per-severity TTLs are enforced by the cleanup task. */
export const NOTIFICATION_DATA_RETENTION = '180d' as const;

/**
 * Only queried fields are mapped; `title`/`description`/`cta` stay in `_source`.
 *
 * Elasticsearch owns the template that reaches the backing indices (`kibana-notifications.json`
 * in the ES Kibana module). This copy exists to type the data stream client and must mirror it.
 */
export const notificationDataStreamMappings = {
  // keep the stream forward-compatible with fields added by newer nodes
  dynamic: false,
  properties: {
    /** Ingest time, generated during write by NC plugin only */
    '@timestamp': mappings.date(),
    /** Idempotency key */
    notification_id: mappings.keyword(),
    event_timestamp: mappings.date(),
    namespace: mappings.keyword(),
    type: mappings.keyword(),
    severity: mappings.keyword(),
    /** Recipient of a targeted notification; absent means broadcast. */
    profile_uid: mappings.keyword(),
    /** Spaces the notification belongs to; `*` means all spaces. */
    space_ids: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export const notificationDataStreamDefinition = {
  name: NOTIFICATION_DATA_STREAM_NAME,
  // bump on any mapping or lifecycle change
  version: 1,
  hidden: true,
  system: true,
  template: {
    // Left at the package default (100) so the Elasticsearch template, registered at 200, wins.
    lifecycle: {
      data_retention: NOTIFICATION_DATA_RETENTION,
    },
    mappings: notificationDataStreamMappings,
  },
} satisfies DataStreamDefinition<typeof notificationDataStreamMappings, Notification>;

export const registerNotificationDataStream = (dataStreams: DataStreamsSetup) =>
  dataStreams.registerDataStream(notificationDataStreamDefinition);

export type NotificationDataStreamClient = IDataStreamClient<
  typeof notificationDataStreamMappings,
  Notification
>;

/** Returns a cached data stream client */
export const getNotificationDataStreamClient = (
  dataStreams: DataStreamsStart
): Promise<NotificationDataStreamClient> =>
  dataStreams.initializeClient<typeof notificationDataStreamMappings, Notification>(
    NOTIFICATION_DATA_STREAM_NAME
  );
