/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
} from '../roles';

/*
 * Roles that only a UI test can want, expressed as the privileges a screen adds on top of a role
 * from `common/roles.ts` — either because they are named for a surface, or because they grant
 * non-alerting features purely so that surface renders. API tests describe a role by privilege, so
 * keeping these out of `common/roles.ts` leaves nothing there an API test cannot name.
 */

type KibanaFeaturePrivileges = KibanaRole['kibana'][number]['feature'];

const withFeatures = (base: KibanaRole, features: KibanaFeaturePrivileges): KibanaRole => ({
  ...base,
  kibana: base.kibana.map((entry) => ({ ...entry, feature: { ...entry.feature, ...features } })),
});

/** Rule create/edit from Discover; the added reads back the linked policies and threshold steps. */
export const RULE_FORM_ROLE = withFeatures(ALERTING_V2_RULES_ALL_ROLE, {
  alerting_v2_action_policies: ['read'],
  alerting_v2_alerts: ['read'],
});

/** Action policy create/edit form, which also resolves its workflow destination. */
export const ACTION_POLICY_FORM_ROLE = withFeatures(
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  {
    alerting_v2_alerts: ['read'],
    workflowsManagement: ['read'],
  }
);

/** Rules list for a viewer who can also read classic (v1) rules, so both list tabs render. */
export const RULES_READ_AND_V1_READ_ROLE = withFeatures(ALERTING_V2_RULES_READ_ROLE, {
  stackAlerts: ['read'],
  logs: ['read'],
});

/** Alert episode details, including the execution history tab it mounts. */
export const EPISODE_DETAILS_READ_ROLE = withFeatures(ALERTING_V2_ALERTS_READ_ROLE, {
  alerting_v2_execution_history: ['read'],
});

/** Execution history page, whose rows resolve the policies and workflows they dispatched to. */
export const EXECUTION_HISTORY_PAGE_READ_ROLE = withFeatures(
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  {
    alerting_v2_alerts: ['read'],
    alerting_v2_action_policies: ['read'],
    workflowsManagement: ['read'],
  }
);
