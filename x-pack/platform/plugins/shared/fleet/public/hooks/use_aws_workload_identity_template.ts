/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { getAwsIdentityFederationTemplateUrl } from '../components/cloud_connector/utils';

import { useDisabledIdentityFederationProviders } from './use_disabled_identity_federation_providers';

/**
 * Whether the aws packages' Identity Federation option should launch the hardcoded Elastic
 * Workload Identity CloudFormation template instead of the package's `iac_template_url`.
 *
 * Driven by the existing `fleet.awsIdentityFederationEnabled` LaunchDarkly flag (on in
 * Serverless, off on ECH): the same switch that shows the aws Identity Federation option also
 * points it at the Workload Identity template. Reacts to a flag flip without a reload.
 */
export function useAwsWorkloadIdentityTemplateEnabled(): boolean {
  const disabledProviders = useDisabledIdentityFederationProviders();
  return !disabledProviders.includes('aws');
}

export interface UseAwsIdentityFederationTemplateUrlParams {
  packageName: string | undefined;
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
  iacTemplateUrl,
}: UseAwsIdentityFederationTemplateUrlParams): string | undefined {
  const isWorkloadIdentityTemplateEnabled = useAwsWorkloadIdentityTemplateEnabled();
  return useMemo(
    () =>
      getAwsIdentityFederationTemplateUrl({
        isWorkloadIdentityTemplateEnabled,
        packageName,
        iacTemplateUrl,
      }),
    [isWorkloadIdentityTemplateEnabled, packageName, iacTemplateUrl]
  );
}
