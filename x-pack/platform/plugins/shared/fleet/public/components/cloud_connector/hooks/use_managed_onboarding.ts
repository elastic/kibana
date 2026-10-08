/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';

import { AWS_MANAGED_ONBOARDING_FLAG } from '../../../../common/constants';
import type { AwsOnboardingCredentialsPublic } from '../../../../common/types/rest_spec/aws_onboarding';
import { useStartServices } from '../../../hooks';
import { sendGetAwsOnboardingCredentials } from '../../../hooks/use_request/aws_onboarding';
import type { CloudSetupForCloudConnector } from '../types';

export const AWS_ONBOARDING_CREDENTIALS_QUERY_KEY = 'aws-onboarding-credentials';

const NOT_CONFIGURED: AwsOnboardingCredentialsPublic = { configured: false };

/**
 * Managed AWS onboarding (POC) is available when the feature flag is on and Kibana runs on
 * Elastic Cloud (the stack parameters come from the cloud context); it is active once the
 * customer has stored bootstrap credentials.
 */
export const useManagedOnboarding = (cloud: CloudSetupForCloudConnector | undefined) => {
  // Existing cloud-connector test suites mock the start services partially (or not at all);
  // without a feature-flags service the POC is simply off.
  const featureFlags = useStartServices()?.featureFlags;
  const flag$ = useMemo(
    () => featureFlags?.getBooleanValue$(AWS_MANAGED_ONBOARDING_FLAG, false) ?? of(false),
    [featureFlags]
  );
  const flagEnabled = useObservable(flag$, false);
  const isHosted = Boolean(cloud?.isCloudEnabled || cloud?.isServerlessEnabled);
  const isEnabled = flagEnabled && isHosted;

  const { data, isLoading, refetch } = useQuery<AwsOnboardingCredentialsPublic>(
    [AWS_ONBOARDING_CREDENTIALS_QUERY_KEY],
    async () => {
      const { data: credentials, error } = await sendGetAwsOnboardingCredentials();
      // 404 = flag off server-side; treat every failure as "not configured" rather than blocking the form.
      if (error || !credentials) {
        return NOT_CONFIGURED;
      }
      return credentials;
    },
    { enabled: isEnabled, retry: false, refetchOnWindowFocus: false }
  );

  const credentials = data ?? NOT_CONFIGURED;
  return {
    isEnabled,
    isConfigured: isEnabled && credentials.configured,
    credentials,
    isLoading: isEnabled && isLoading,
    refetch,
  };
};
