/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The append-only system data stream backing the Notification Center.
 *
 * Elasticsearch owns this stream: its `kibana` module registers a `SystemDataStreamDescriptor`
 * that carries the index template (mappings, `180d` retention, hidden) and auto-creates the
 * stream on the first write (elastic/elasticsearch#161292). This plugin only reads and writes
 * documents; it never installs a template or creates the stream itself.
 */
export const NOTIFICATION_DATA_STREAM_NAME = '.kibana-notifications' as const;

/**
 * Retention ceiling applied by the ES-owned template; per-severity TTLs are enforced by the
 * cleanup task and must stay within it.
 */
export const NOTIFICATION_DATA_RETENTION_DAYS = 180;
