/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { AWS_WORKLOAD_IDENTITY_TEMPLATE_ENABLED_FLAG } from '../../common/constants/cloud_connector';
import { getAwsIdentityFederationTemplateUrl } from '../components/cloud_connector/utils';

import { useStartServices } from './use_core';

/**
 * Whether `fleet.awsWorkloadIdentityTemplateEnabled` is on. When it is, the aws packages'
 * Identity Federation option launches the hardcoded Elastic Workload Identity CloudFormation
 * template instead of the package's `iac_template_url`.
 *
 * Subscribes to `getBooleanValue$` so a flag flipped while the form is open takes effect
 * without a reload. Falls back to disabled when LaunchDarkly is unavailable (ECH behaviour).
 */
export function useAwsWorkloadIdentityTemplateEnabled(): boolean {
  const { featureFlags } = useStartServices();

  // getBooleanValue$ builds a new observable per call, so memoize it or useObservable
  // re-subscribes on every render.
  const enabled$ = useMemo(
    () => featureFlags.getBooleanValue$(AWS_WORKLOAD_IDENTITY_TEMPLATE_ENABLED_FLAG, false),
    [featureFlags]
  );
  return useObservable(enabled$, false);
}

export interface UseAwsIdentityFederationTemplateUrlParams {
  packageName: string | undefined;
  packageVersion: string | undefined;
  /** URL from the package's `iac_template_url`. */
  iacTemplateUrl: string | undefined;
}

/**
 * The quick-create URL the aws Identity Federation option should launch for this package:
 * the hardcoded Workload Identity template when the flag is on and the package moved to it,
 * otherwise `iacTemplateUrl` unchanged.
 */
export function useAwsIdentityFederationTemplateUrl({
  packageName,
  packageVersion,
  iacTemplateUrl,
}: UseAwsIdentityFederationTemplateUrlParams): string | undefined {
  const isWorkloadIdentityTemplateEnabled = useAwsWorkloadIdentityTemplateEnabled();
  return useMemo(
    () =>
      getAwsIdentityFederationTemplateUrl({
        isWorkloadIdentityTemplateEnabled,
        packageName,
        packageVersion,
        iacTemplateUrl,
      }),
    [isWorkloadIdentityTemplateEnabled, packageName, packageVersion, iacTemplateUrl]
  );
}
