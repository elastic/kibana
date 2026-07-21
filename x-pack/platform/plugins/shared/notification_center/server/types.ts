/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationInput } from '../common/types';

/** Public server-side setup contract. */
export interface NotificationCenterPluginSetup {
  /** Validate a draft, stamp `@timestamp`, and append it to the `.kibana-notification-center` data stream. */
  submitNotification: (draft: NotificationInput) => Promise<void>;
}

export type NotificationCenterPluginStart = Record<string, never>;

export type NotificationCenterSetupDependencies = Record<string, never>;

export type NotificationCenterStartDependencies = Record<string, never>;
