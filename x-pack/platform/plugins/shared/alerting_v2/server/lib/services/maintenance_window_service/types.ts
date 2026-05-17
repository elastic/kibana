/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ActiveMaintenanceWindowEvent {
  gteMs: number;
  lteMs: number;
}

export interface ActiveMaintenanceWindow {
  id: string;
  spaceId: string;
  events: ActiveMaintenanceWindowEvent[];
  scope?: {
    alerting?: unknown;
    alertingV2?: { kql?: string };
  };
}
