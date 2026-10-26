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
  useGetCloudOnboardingDeploymentsQuery,
  useStartServices,
} from '../../../../../../../hooks';
import { ONBOARDING_ENABLED_FLAG } from '../../../../../../../services/aws_onboarding_override';

const MAX_COLLECTION_INSTANCES = 100;

/**
 * The onboarding sessions ("collection instances") saved for AWS, grouped by every package they
 * cover. Empty unless the onboarding flow is enabled and the user can read them.
 */
export function useCollectionInstances() {
  const { featureFlags } = useStartServices();
  const authz = useAuthz();
  const isEnabled =
    featureFlags.useBooleanValue(ONBOARDING_ENABLED_FLAG, false) &&
    (authz.fleet.readAgentPolicies || authz.integrations.readPackageInfo);

  const { data, isLoading } = useGetCloudOnboardingDeploymentsQuery(
    { provider: 'aws', perPage: MAX_COLLECTION_INSTANCES },
    { enabled: isEnabled }
  );

  const instancesByPackage = useMemo(() => {
    const byPackage: Record<string, CloudOnboardingDeploymentListItem[]> = {};
    for (const item of data?.items ?? []) {
      for (const packageName of item.packageNames ?? []) {
        (byPackage[packageName] ??= []).push(item);
      }
    }
    return byPackage;
  }, [data]);

  return { instancesByPackage, isLoading: isEnabled && isLoading };
}
