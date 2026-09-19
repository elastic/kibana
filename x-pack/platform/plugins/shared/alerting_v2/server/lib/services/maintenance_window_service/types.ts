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
    // null = v2 selected, no filter (suppress all v2 episodes in window);
    // object = v2 selected with KQL filter; undefined = v2 not selected.
    alertingV2?: { enabled: boolean; kql?: string };
  };
}
