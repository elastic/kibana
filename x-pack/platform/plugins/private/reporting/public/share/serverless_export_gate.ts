/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/public';
import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';

import { REPORTING_SERVERLESS_EXPORT_ENABLED } from '../../common/feature_flags';

type PrerequisiteCheck = NonNullable<
  RegisterShareIntegrationArgs<ExportShare>['prerequisiteCheck']
>;

export interface ServerlessExportGateOpts {
  isServerless: boolean;
  /**
   * Returns `undefined` until the start lifecycle has run. The gate is only ever called from a
   * share integration's `prerequisiteCheck`, which the share plugin invokes when a user opens a
   * share menu — always after start — so in practice the service is available by then. Treating
   * `undefined` as "off" keeps the unavailable case aligned with the flag's own fallback.
   */
  getFeatureFlags: () => FeatureFlagsStart | undefined;
}

/**
 * Availability of PDF/PNG export on serverless, re-evaluated on every share menu open so the
 * feature flag can be rolled forward or back without restarting Kibana.
 *
 * Traditional/ECH short-circuits to `true` and never reads the flag: those exports have shipped
 * there for years, and the serverless rollout must not be able to regress them.
 */
export const createServerlessExportGate =
  ({ isServerless, getFeatureFlags }: ServerlessExportGateOpts) =>
  (): boolean => {
    if (!isServerless) {
      return true;
    }

    return getFeatureFlags()?.getBooleanValue(REPORTING_SERVERLESS_EXPORT_ENABLED, false) ?? false;
  };

/**
 * Hides a share integration's menu entry while `isAvailable()` returns false, leaving the
 * integration's own license and capability checks untouched.
 *
 * Share integrations are registered during `setup`, where no feature flag can be evaluated, so the
 * flag has to be applied at the only per-menu-open hook the share plugin offers. An integration
 * with no `prerequisiteCheck` of its own is always available, hence the `?? true`.
 */
export const withAvailabilityGate = <T extends object>(
  integration: T & { prerequisiteCheck?: PrerequisiteCheck },
  isAvailable: () => boolean
): T & { prerequisiteCheck: PrerequisiteCheck } => ({
  ...integration,
  prerequisiteCheck: (args) => isAvailable() && (integration.prerequisiteCheck?.(args) ?? true),
});
