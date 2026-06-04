/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public browser-side setup contract. Empty while the plugin is a bare shell;
 * the user-visible UI (gated on `notificationsCenter.uiEnabled`) lands in a
 * later issue.
 */
export type NotificationsCenterPublicSetup = Record<string, never>;

/**
 * Public browser-side start contract. Empty for now.
 */
export type NotificationsCenterPublicStart = Record<string, never>;
