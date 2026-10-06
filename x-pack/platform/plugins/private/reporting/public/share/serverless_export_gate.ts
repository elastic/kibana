/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';

type PrerequisiteCheck = NonNullable<
  RegisterShareIntegrationArgs<ExportShare>['prerequisiteCheck']
>;

export interface ServerlessExportGateOpts {
  isServerless: boolean;
  /**
   * Emits the rollout flag's value, and keeps emitting as it changes. Feature flags are only
   * exposed as observables, but a share integration's `prerequisiteCheck` is synchronous, so the
   * gate subscribes once and answers from the latest value. Until the first emission the gate
   * reports "off", which matches the flag's own fallback. The caller owns the subscription's
   * lifetime (complete the stream on plugin stop).
   */
  serverlessExportEnabled$: Observable<boolean>;
}

/**
 * Availability of PDF/PNG export on serverless, following the feature flag live so it can be
 * rolled forward or back without restarting Kibana.
 *
 * Traditional/ECH short-circuits to `true` and never subscribes to the flag: those exports have
 * shipped there for years, and the serverless rollout must not be able to regress them.
 */
export const createServerlessExportGate = ({
  isServerless,
  serverlessExportEnabled$,
}: ServerlessExportGateOpts): (() => boolean) => {
  if (!isServerless) {
    return () => true;
  }

  let enabled = false;
  serverlessExportEnabled$.subscribe((value) => {
    enabled = value;
  });

  return () => enabled;
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
