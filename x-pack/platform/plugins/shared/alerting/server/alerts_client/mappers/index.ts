/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// applyAlertLimit should be first in the applied mapping functions
export { applyAlertLimit } from './1_alert_limit';

// remaining mappers can be imported in any order but we order them
// for repeatability and consistency
export { applyMaintenanceWindows } from './2_maintenance_window';
export { applyFlapping } from './3_flapping';
export { applyFlappingHistory } from './4_flapping_history';
export { applyFlappingRecovery } from './5_flapping_recovery';
export { applyAlertDelay } from './6_alert_delay';
