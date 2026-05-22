/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Minimal role granting full read/write access to rules + alerts in all spaces.
 * Use for tests that exercise the rule lifecycle (create / update / delete) without
 * needing the full `admin` privilege set.
 */
export const ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['all'],
    indices: [{ names: ['*'], privileges: ['all'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['all'],
        alerting_v2_alerts: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Minimal read-only role.
 * Use for tests that only render the UI without mutating rule state.
 */
export const READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        alerting_v2_alerts: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Role with no alerting_v2 privileges. Used to assert that endpoints reject
 * users that lack the required `alerting_v2_*` feature privileges (typically
 * with a `403`).
 */
export const NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
