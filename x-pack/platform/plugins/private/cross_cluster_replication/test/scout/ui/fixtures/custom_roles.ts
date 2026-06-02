/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// KibanaRole requires both `base` and `feature` in kibana entries, and `cluster`
// in elasticsearch (use empty arrays/objects when those privileges are not needed).
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // cluster: manage, manage_ccr, monitor, read_ccr + Kibana base:all.
  // monitor is required by ccr.stats(); read_ccr is required by ccr.followInfo().
  global_ccr_role: {
    elasticsearch: { cluster: ['manage', 'manage_ccr', 'monitor', 'read_ccr'] },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },
};
