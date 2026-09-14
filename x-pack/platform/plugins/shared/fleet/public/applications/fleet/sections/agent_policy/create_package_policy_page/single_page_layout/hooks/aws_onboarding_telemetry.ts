/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import {
  AWS_ONBOARDING_PACKAGE_NAME,
  reportAwsOnboardingCredentialsAdded,
  reportAwsOnboardingDeployClicked,
  reportAwsOnboardingEnrollmentSucceeded,
} from '../../../../../../../../common/telemetry/aws_onboarding_events';
import type { AwsOnboardingDeployPath } from '../../../../../../../../common/telemetry/aws_onboarding_events';
import { useStartServices } from '../../../../../../../hooks';
import { useIntraAppState } from '../../../../../../../hooks/use_intra_app_state';
import type { CreatePackagePolicyRouteState } from '../../../../../../../types';

/**
 * Returns telemetry report callbacks for the AWS onboarding funnel, to be called at key moments in
 * the create-package-policy flow. All helpers no-op silently when:
 * - The page was NOT reached from the AWS quickstart (telemetrySource ≠ 'aws_quickstart').
 * - The package is not aws_cloudwatch_input_otel.
 * - The event was already reported in this session (single-fire guard, stored in sessionStorage).
 *
 * Helpers are framework-agnostic; they read analytics from core start-services so callers don't
 * need to plumb it themselves.
 */
export function useAwsOnboardingTelemetry({ pkgName }: { pkgName: string | undefined }) {
  const { analytics } = useStartServices();
  const routeState = useIntraAppState<CreatePackagePolicyRouteState>();
  const isAwsQuickstart =
    routeState?.telemetrySource === 'aws_quickstart' && pkgName === AWS_ONBOARDING_PACKAGE_NAME;

  /**
   * Emit `credentials_added` once (single-fire, guarded in sessionStorage).
   * Fires ONLY for the AWS quickstart funnel.
   */
  const reportCredentialsAdded = useCallback(() => {
    if (!isAwsQuickstart || !analytics) return;
    reportAwsOnboardingCredentialsAdded(analytics, sessionStorage);
  }, [isAwsQuickstart, analytics]);

  /**
   * Emit `deploy_clicked` once per path (single-fire, guarded in sessionStorage).
   * Fires ONLY for the AWS quickstart funnel.
   *
   * @param path - 'agentless' or 'aws_cloudformation'
   * @param services - service ids activated on the agentless path (omit for cloudformation)
   */
  const reportDeployClicked = useCallback(
    (path: AwsOnboardingDeployPath, services?: string[]) => {
      if (!isAwsQuickstart || !analytics) return;
      reportAwsOnboardingDeployClicked(analytics, sessionStorage, { path, services });
    },
    [isAwsQuickstart, analytics]
  );

  /** Emit `agentless_enrollment_succeeded` once. Fires ONLY for the AWS quickstart funnel. */
  const reportEnrollmentSucceeded = useCallback(() => {
    if (!isAwsQuickstart || !analytics) return;
    reportAwsOnboardingEnrollmentSucceeded(analytics, sessionStorage);
  }, [isAwsQuickstart, analytics]);

  return { reportCredentialsAdded, reportDeployClicked, reportEnrollmentSucceeded };
}
