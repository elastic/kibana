/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { getAwsIdentityFederationTemplateUrl } from '../components/cloud_connector/utils';

import { useDisabledIdentityFederationProviders } from './use_disabled_identity_federation_providers';

/** Whether the aws Identity Federation option launches the Workload Identity template, per `fleet.awsIdentityFederationEnabled`. */
export function useAwsWorkloadIdentityTemplateEnabled(): boolean {
  const disabledProviders = useDisabledIdentityFederationProviders();
  return !disabledProviders.includes('aws');
}

export interface UseAwsIdentityFederationTemplateUrlParams {
  packageName: string | undefined;
  iacTemplateUrl: string | undefined;
}

/** The template URL the aws Identity Federation option should launch for the package. */
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
