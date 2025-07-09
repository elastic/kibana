/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// mapAlertLimit should be first in the applied mapping functions
export { mapAlertLimit } from './1_alert_limit';

// remaining mappers can be imported in any order but we order them
// for repeatability and consistency
export { mapMaintenanceWindows } from './2_maintenance_window';
export { mapFlapping } from './3_flapping';
export { mapFlappingRecovery } from './4_flapping_recovery';
export { mapAlertDelay } from './5_alert_delay';
