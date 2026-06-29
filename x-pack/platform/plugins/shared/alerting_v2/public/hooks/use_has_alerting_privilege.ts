/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { CoreStart, useService } from '@kbn/core-di-browser';
import {
  ALERTING_V2_FEATURES,
  ALERTING_V2_UI_CAPABILITIES,
  type AlertingV2Feature,
} from '../../common/feature_privileges';

type AlertingCapability = 'read' | 'all';

/**
 * Pure capability check usable outside of the DI context. Reads the UI
 * capability surfaced by the corresponding `alerting_v2_*` Kibana feature
 * (e.g. `capabilities.alerting_v2_rules.read`).
 *
 * `read` is the minimum privilege required to view a feature's pages; users
 * with `all` also receive `read`, so checking `read` covers both.
 */
export const getHasAlertingPrivilege = (
  application: ApplicationStart,
  feature: AlertingV2Feature,
  capability: AlertingCapability = ALERTING_V2_UI_CAPABILITIES[feature].read
): boolean => {
  const featureId = ALERTING_V2_FEATURES[feature].id;
  return application.capabilities[featureId]?.[capability] === true;
};

/**
 * Pure check for a *set* of features. Returns `true` only when the user holds
 * the requested capability for every feature in the set (AND semantics), which
 * is how a page expresses a combined minimum privilege requirement.
 */
export const getHasAllAlertingPrivileges = (
  application: ApplicationStart,
  features: readonly AlertingV2Feature[],
  capability?: AlertingCapability
): boolean =>
  features.every((feature) => getHasAlertingPrivilege(application, feature, capability));

/**
 * Hook for components rendered inside the Inversify DI context. Returns whether
 * the current user holds the minimum (`read` by default) capability for *all*
 * of the given alerting_v2 features.
 */
export const useHasAllAlertingPrivileges = (
  features: readonly AlertingV2Feature[],
  capability?: AlertingCapability
): boolean => {
  const application = useService(CoreStart('application'));
  return getHasAllAlertingPrivileges(application, features, capability);
};
