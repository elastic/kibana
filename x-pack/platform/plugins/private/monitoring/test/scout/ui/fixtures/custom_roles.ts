/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// Kibana base:all across all spaces, no ES cluster/application privileges.
// Drives the "no Stack Monitoring sidebar link" assertion — the monitoring
// navlink is gated on the reserved_monitoring ES application privilege,
// which a Kibana-only role does not get.
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  global_all_kibana_only: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },
};
