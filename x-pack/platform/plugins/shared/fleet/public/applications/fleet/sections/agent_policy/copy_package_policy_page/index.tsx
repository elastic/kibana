/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { useRouteMatch, useLocation } from 'react-router-dom';

import { useBulkGetAgentPoliciesQuery } from '../../../hooks';
import { useGetOnePackagePolicy } from '../../../../integrations/hooks';
import { Loading } from '../../../components';
import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';

import { CreatePackagePolicySinglePage } from '../create_package_policy_page/single_page_layout';

export const CopyPackagePolicyPage = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();

  const packagePolicy = useGetOnePackagePolicy(packagePolicyId);

  const packagePolicyData = useMemo(() => {
    if (packagePolicy.data?.item) {
      return {
        ...packagePolicy.data.item,
        name: 'copy-' + packagePolicy.data.item.name,
      };
    }
  }, [packagePolicy.data?.item]);

  const agentPolicies = useBulkGetAgentPoliciesQuery(packagePolicyData?.policy_ids || [], {
    enabled: !!packagePolicyData?.policy_ids,
  });

  // Parse the 'from' query parameter to determine navigation after save
  const { search } = useLocation();
  const qs = new URLSearchParams(search);
  const fromQs = qs.get('from') as EditPackagePolicyFrom | null;

  if (packagePolicy.isLoading || agentPolicies.isLoading || !agentPolicies.data) {
    return <Loading />;
  }

  return (
    <CreatePackagePolicySinglePage
      from={fromQs || ('copy-from-integrations-policy-list' as EditPackagePolicyFrom)}
      pkgName={packagePolicy.data!.item!.package!.name}
      pkgVersion={packagePolicy.data!.item!.package!.version}
      defaultPolicyData={packagePolicyData}
      defaultAgentPolicies={agentPolicies.data?.items || []}
      prerelease={true}
    />
  );
});
