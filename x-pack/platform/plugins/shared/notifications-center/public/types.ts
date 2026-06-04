/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * UI plugin setup is gated on `notificationsCenter.uiEnabled` feature flag
 */
export type NotificationsCenterPublicSetup = Record<string, never>;

export type NotificationsCenterPublicStart = Record<string, never>;
