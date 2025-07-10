/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// applyAlertLimit should be first in the applied mapping functions
export { applyAlertLimit } from './alert_limit';

// TODO how to apply an ordering

// remaining mappers can be imported in any order but we order them
// for repeatability and consistency
export { applyMaintenanceWindows } from './maintenance_window';
export { applyFlapping } from './flapping';
export { applyFlappingHistory } from './flapping_history';
export { applyFlappingRecovery } from './flapping_recovery';
export { applyAlertDelay } from './alert_delay';
