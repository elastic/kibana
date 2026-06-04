/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public server-side setup contract.
 *
 * Empty while the plugin is a bare shell. The external `submit(draft)`
 * API that consumers call to push notifications will be added here
 */
export type NotificationsCenterPluginSetup = Record<string, never>;

/**
 * Public server-side start contract. Empty for now (see {@link NotificationsCenterPluginSetup}).
 */
export type NotificationsCenterPluginStart = Record<string, never>;

export type NotificationsCenterSetupDependencies = Record<string, never>;

export type NotificationsCenterStartDependencies = Record<string, never>;
