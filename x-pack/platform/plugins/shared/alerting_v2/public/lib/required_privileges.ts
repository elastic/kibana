/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_FEATURES,
  ALERTING_V2_UI_CAPABILITIES,
  type AlertingV2Feature,
} from '../../common/feature_privileges';

type AlertingV2Capability = 'read' | 'all';

/**
 * Describes a single privilege a user must hold to view a gated page, surfaced
 * in the "Privileges required" interstitial so the user can tell their admin
 * exactly what to grant.
 */
export interface AlertingV2RequiredPrivilege {
  /** Kibana feature id backing the capability, e.g. "alerting_v2_rules". */
  featureId: string;
  /** Feature name as it appears in role management, e.g. "Rules". */
  featureName: string;
  /** Minimum feature privilege that grants the capability, e.g. "read". */
  privilege: AlertingV2Capability;
  /**
   * Fully-qualified UI capability the page checks, e.g.
   * "alerting_v2_rules.read".
   */
  capability: string;
}

/**
 * Builds the list of privileges required to view a page from its feature set.
 * The `read` capability is minimally granted by the feature's `read` privilege
 * (and also by `all`), so the privilege level mirrors the requested capability.
 */
export const getAlertingV2RequiredPrivileges = (
  features: readonly AlertingV2Feature[],
  capability: AlertingV2Capability = 'read'
): AlertingV2RequiredPrivilege[] =>
  features.map((feature) => {
    const { id, name } = ALERTING_V2_FEATURES[feature];
    return {
      featureId: id,
      featureName: name,
      privilege: capability,
      capability: `${id}.${ALERTING_V2_UI_CAPABILITIES[feature][capability]}`,
    };
  });
