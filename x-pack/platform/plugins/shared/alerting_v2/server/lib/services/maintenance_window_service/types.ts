/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';

interface ActiveMaintenanceWindowEvent {
  gteMs: number;
  lteMs: number;
}

export interface ActiveMaintenanceWindow {
  id: string;
  spaceId: string;
  enabled: boolean;
  events: ActiveMaintenanceWindowEvent[];
  scope?: MaintenanceWindowAttributes['scope'];
}
