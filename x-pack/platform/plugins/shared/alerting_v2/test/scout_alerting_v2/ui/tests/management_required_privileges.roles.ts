/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Roles dedicated to the management-page privilege-gating UI spec.
 *
 * This suite is purely a UI-gating test: it logs in, visits each management
 * page, and asserts that either the page heading or the "Privileges required"
 * interstitial renders. That outcome is driven entirely by the Kibana
 * `alerting_v2_*` feature privileges — the test never reads or writes ES data.
 *
 * The roles therefore grant **no Elasticsearch privileges**. Keeping them empty
 * is what lets this suite run under `tags.deploymentAgnostic`: serverless
 * rejects arbitrary ES cluster privileges, so the broader ES-backed roles used
 * by the API tests cannot be provisioned there. These are intentionally not
 * shared with the API suite — do not add ES privileges here.
 */
const NO_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [],
};

/** Full access to every alerting_v2 management feature. */
export const ALL_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['all'],
        alerting_v2_alerts: ['all'],
        alerting_v2_action_policies: ['all'],
        alerting_v2_execution_history: ['all'],
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

/** Read-only access to every alerting_v2 management feature. */
export const READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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

/** No alerting_v2 access at all; every management page must be gated. */
export const NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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

/** Read-only access scoped to a single alerting_v2 feature. */
export const RULES_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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

export const ALERTS_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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

export const ACTION_POLICIES_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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

export const EXECUTION_HISTORY_READ_ROLE: KibanaRole = {
  elasticsearch: NO_ES_PRIVILEGES,
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
