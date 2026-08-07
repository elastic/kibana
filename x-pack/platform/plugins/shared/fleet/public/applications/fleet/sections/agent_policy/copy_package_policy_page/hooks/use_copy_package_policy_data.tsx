/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { useGetOnePackagePolicyQuery } from '../../../../hooks';
import type { RequestError } from '../../../../hooks';
import type { PackagePolicy } from '../../../../types';
import { fetchAgentlessPolicyAsPackagePolicy } from '../../services';

/**
 * Read the policy that a copy is being created from.
 *
 * Agentless copies must not touch the package-policy/agent-policy APIs (detect-before-read via the
 * `isAgentless` link hint), so they hydrate through the agentless API and reuse the same inverse
 * mapper as the edit read path. Traditional copies keep reading the package policy directly.
 *
 * Only one of the two queries is ever enabled, so exactly one API is called per copy.
 */
export function useCopyPackagePolicyData(
  packagePolicyId: string,
  { isAgentless }: { isAgentless: boolean }
): { item?: PackagePolicy; isLoading: boolean; isError: boolean; error: RequestError | null } {
  const packagePolicyQuery = useGetOnePackagePolicyQuery(packagePolicyId, {
    enabled: !isAgentless,
  });

  const agentlessPolicyQuery = useQuery<PackagePolicy, RequestError>(
    ['copyAgentlessPolicy', packagePolicyId],
    async () => {
      // The expanded policy carries the source id through; the copy helper strips it (along with
      // `version`) before creating the fresh policy. `supports_agentless` stays true so the
      // create page routes the copy write through the agentless create API.
      const { packagePolicy } = await fetchAgentlessPolicyAsPackagePolicy(packagePolicyId);
      return packagePolicy as PackagePolicy;
    },
    { enabled: isAgentless, refetchOnWindowFocus: false }
  );

  if (isAgentless) {
    return {
      item: agentlessPolicyQuery.data,
      isLoading: agentlessPolicyQuery.isLoading,
      isError: agentlessPolicyQuery.isError,
      error: agentlessPolicyQuery.error ?? null,
    };
  }

  return {
    item: packagePolicyQuery.data?.item,
    isLoading: packagePolicyQuery.isLoading,
    isError: packagePolicyQuery.isError,
    error: packagePolicyQuery.error ?? null,
  };
}
