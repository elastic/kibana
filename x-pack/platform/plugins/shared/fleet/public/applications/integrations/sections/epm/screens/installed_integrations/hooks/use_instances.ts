/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';
import {
  useAuthz,
  useGetAllCloudOnboardingDeploymentsQuery,
  useStartServices,
} from '../../../../../../../hooks';
import { ONBOARDING_ENABLED_FLAG } from '../../../../../../../services/aws_onboarding_override';

/**
 * The onboarding sessions ("instances") saved for AWS, grouped by every package they
 * cover. Empty unless the onboarding flow is enabled and the user can read them. `isError` is set
 * when the sessions could not be loaded, and `refetch` retries. `isTruncated` is set when there
 * were too many sessions to load them all.
 */
export function useInstances() {
  const { featureFlags } = useStartServices();
  const authz = useAuthz();
  const isEnabled =
    featureFlags.useBooleanValue(ONBOARDING_ENABLED_FLAG, false) &&
    (authz.fleet.readAgentPolicies || authz.integrations.readPackageInfo);

  const { data, isLoading, isError, refetch } = useGetAllCloudOnboardingDeploymentsQuery(
    { provider: 'aws' },
    { enabled: isEnabled }
  );

  // A Map, because package names come from the API and could be `constructor` or `__proto__`.
  const instancesByPackage = useMemo(() => {
    const byPackage = new Map<string, CloudOnboardingDeploymentListItem[]>();
    for (const item of data?.items ?? []) {
      for (const packageName of item.packageNames ?? []) {
        byPackage.set(packageName, [...(byPackage.get(packageName) ?? []), item]);
      }
    }
    return byPackage;
  }, [data]);

  return {
    /** False when the onboarding flow is off or the user cannot read instances. */
    isEnabled,
    instancesByPackage,
    isTruncated: !!data?.isTruncated,
    isLoading: isEnabled && isLoading,
    isError,
    refetch,
  };
}
