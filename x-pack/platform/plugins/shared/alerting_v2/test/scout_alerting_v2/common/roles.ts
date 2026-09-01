/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { ALERTING_V2_FEATURE_IDS } from '@kbn/alerting-v2-constants';

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
        [ALERTING_V2_FEATURE_IDS.rules]: ['all'],
        [ALERTING_V2_FEATURE_IDS.alerts]: ['all'],
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['all'],
        [ALERTING_V2_FEATURE_IDS.executionHistory]: ['all'],
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
        [ALERTING_V2_FEATURE_IDS.rules]: ['read'],
        [ALERTING_V2_FEATURE_IDS.alerts]: ['read'],
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['read'],
        [ALERTING_V2_FEATURE_IDS.executionHistory]: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Role with no alerting_v2 privileges. Used to assert that endpoints reject
 * users that lack the required alerting v2 feature privileges (typically
 * with a `403`) and, in UI tests, that unprivileged users are redirected away
 * from the alerting_v2 management pages.
 */
export const NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: NO_ACCESS_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
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
        [ALERTING_V2_FEATURE_IDS.rules]: ['all'],
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
        [ALERTING_V2_FEATURE_IDS.rules]: ['read'],
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
        [ALERTING_V2_FEATURE_IDS.alerts]: ['all'],
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
        [ALERTING_V2_FEATURE_IDS.alerts]: ['read'],
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
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['all'],
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
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Composite role granting full access to action policies plus read access to
 * rules. Used by routes that also need rules read, such as matching action
 * policies for a rule.
 */
export const ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['all'],
        [ALERTING_V2_FEATURE_IDS.rules]: ['read'],
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Everything the action policy form page needs to complete a create/edit
 * round-trip in the browser. Each extra privilege is one the form actually
 * exercises:
 *
 * - rules `read` — the create and upsert routes require `rules.read` on top of
 *   `actionPolicies.write`.
 * - alerts `read` — the matcher input fetches data-field suggestions from
 *   `GET /suggestions/rule_event_fields`.
 * - `workflowsManagement: ['read']` — destinations are workflow references, so
 *   the `destinationsInput` combo box lists workflows via the workflows plugin.
 */
export const ALERTING_V2_ACTION_POLICY_FORM_ROLE: KibanaRole = {
  elasticsearch: WRITER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        [ALERTING_V2_FEATURE_IDS.actionPolicies]: ['all'],
        [ALERTING_V2_FEATURE_IDS.rules]: ['read'],
        [ALERTING_V2_FEATURE_IDS.alerts]: ['read'],
        workflowsManagement: ['read'],
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
        [ALERTING_V2_FEATURE_IDS.executionHistory]: ['all'],
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
        [ALERTING_V2_FEATURE_IDS.executionHistory]: ['read'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
