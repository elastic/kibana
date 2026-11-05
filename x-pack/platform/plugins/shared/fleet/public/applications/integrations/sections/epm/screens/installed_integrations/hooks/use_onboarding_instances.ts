/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import {
  useAuthz,
  useGetCloudOnboardingDeploymentCountsQuery,
  useStartServices,
} from '../../../../../../../hooks';
import { ONBOARDING_ENABLED_FLAG } from '../../../../../../../services/aws_onboarding_override';

/**
 * How many onboarding sessions ("instances") saved for AWS cover each package. Empty unless the
 * onboarding flow is enabled and the user can read them. `isError` is set when the counts could not
 * be loaded, and `refetch` retries. The sessions themselves are loaded by the panel of a package.
 *
 * Not to be confused with the service instances of a session (`instances`, `policyIdsByInstance`
 * on the saved object): here an instance is the whole session, so one of them may hold several
 * service instances.
 */
export function useOnboardingInstances() {
  const { featureFlags } = useStartServices();
  const authz = useAuthz();
  const isEnabled =
    featureFlags.useBooleanValue(ONBOARDING_ENABLED_FLAG, false) &&
    (authz.fleet.readAgentPolicies || authz.integrations.readPackageInfo);

  const { data, isLoading, isError, refetch } = useGetCloudOnboardingDeploymentCountsQuery(
    { provider: 'aws' },
    { enabled: isEnabled }
  );

  // A Map, because package names come from the API and could be `constructor` or `__proto__`.
  const onboardingInstanceCounts = useMemo(
    () => new Map(Object.entries(data?.counts ?? {})),
    [data]
  );

  return {
    /** False when the onboarding flow is off or the user cannot read instances. */
    isEnabled,
    onboardingInstanceCounts,
    isLoading: isEnabled && isLoading,
    isError,
    refetch,
  };
}
