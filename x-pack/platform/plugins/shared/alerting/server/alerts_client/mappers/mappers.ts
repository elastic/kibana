/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyAlertLimit } from './alert_limit';

import { applyMaintenanceWindows } from './maintenance_window';
import { applyFlapping } from './flapping';
import { applyFlappingHistory } from './flapping_history';
import { applyFlappingRecovery } from './flapping_recovery';
import { applyAlertDelay } from './alert_delay';
import { applyEventLogger } from './event_logger';

export const mappers = [
  // applyAlertLimit should be first in the applied mapping functions
  applyAlertLimit,

  applyMaintenanceWindows,

  // flapping mappers are applied in a specific order
  applyFlapping,
  applyFlappingHistory,
  applyFlappingRecovery,

  applyAlertDelay,

  applyEventLogger,
] as const;
