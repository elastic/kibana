/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The append-only data stream backing the Notification Center.
 *
 * Elasticsearch owns it end to end: the `SystemDataStreamDescriptor` registered by the ES Kibana
 * module carries the mappings, the lifecycle and the settings, and creates the stream on the
 * first write. Kibana registers nothing — a definition here could only drift from the descriptor
 * or, worse, win over it for a non-system name.
 */
export const NOTIFICATION_DATA_STREAM_NAME = '.kibana-notifications' as const;

/**
 * The retention the descriptor enforces, mirrored as the ceiling the cleanup task's per-severity
 * TTLs must stay under. Changing it means changing `kibana-notifications.json` in Elasticsearch.
 */
export const NOTIFICATION_DATA_RETENTION = '180d' as const;
