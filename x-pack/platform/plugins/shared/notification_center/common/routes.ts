/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Internal HTTP surface for the Notification Center. Shared by the routes and their consumers. */
export const NOTIFICATION_CENTER_API_BASE = '/internal/notification_center' as const;

export const GET_NOTIFICATIONS_PATH = `${NOTIFICATION_CENTER_API_BASE}/notifications` as const;
export const MARK_READ_PATH = `${NOTIFICATION_CENTER_API_BASE}/notifications/_mark_read` as const;
export const MARK_ALL_READ_PATH =
  `${NOTIFICATION_CENTER_API_BASE}/notifications/_mark_all_read` as const;

/** Single internal API version for every NC route. */
export const NOTIFICATION_CENTER_API_VERSION = '1' as const;
