/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

type ElasticsearchPrivileges = KibanaRole['elasticsearch'];

const WRITER_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: ['all'],
  indices: [{ names: ['*'], privileges: ['all'] }],
};

const READER_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: ['monitor'],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

const NO_ACCESS_ES_PRIVILEGES: ElasticsearchPrivileges = {
  cluster: [],
  indices: [],
};

/**
 * Minimal role granting full read/write access to rules + alerts + action
 * policies in all spaces. Use for tests that exercise the full alerting_v2
 * lifecycle without needing the `admin` privilege set.
 */
export const ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['all'],
        alerting_v2_alerts: ['all'],
        alerting_v2_action_policies: ['all'],
        alerting_v2_execution_history: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Minimal read-only role across rules + alerts + action policies.
 * Use for tests that only render the UI or read state without mutating.
 */
export const READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        alerting_v2_alerts: ['read'],
        alerting_v2_action_policies: ['read'],
        alerting_v2_execution_history: ['read'],
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
  elasticsearch: NO_ACCESS_ES_PRIVILEGES,
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

/**
 * Per-feature, single-privilege roles for least-privilege authorization tests.
 *
 * Each role grants exactly one alerting_v2 feature privilege so that an
 * `authorization:` block can assert that a route is gated by exactly the
 * privilege it requires and nothing more (no leakage between features).
 */

export const ALERTING_V2_RULES_ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_RULES_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_ALERTS_ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_alerts: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_ALERTS_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_alerts: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_ACTION_POLICIES_ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_action_policies: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_ACTION_POLICIES_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_action_policies: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Composite role granting full access to action policies plus read access to
 * rules. Required by the create/upsert action policy routes, which also need
 * `alerting_v2_rules: ['read']` to validate the referenced rule when callers
 * create a policy with `type: 'single_rule'`.
 */
export const ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_action_policies: ['all'],
        alerting_v2_rules: ['read'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_execution_history: ['all'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const ALERTING_V2_EXECUTION_HISTORY_READ_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_execution_history: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
