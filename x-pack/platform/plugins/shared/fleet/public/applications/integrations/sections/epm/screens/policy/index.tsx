/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';

// TODO: Needs to be moved
import { EditPackagePolicyForm } from '../../../../../fleet/sections/agent_policy/edit_package_policy_page';
import type { EditPackagePolicyFrom } from '../../../../../fleet/sections/agent_policy/create_package_policy_page/types';
import {
  useGetOnePackagePolicyQuery,
  useIsAgentlessQueryParam,
  useUIExtension,
} from '../../../../hooks';

export const Policy = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ packagePolicyId: string }>();

  const { search } = useLocation();
  const qs = new URLSearchParams(search);

  // Detect-before-read hint: agentless surfaces append `isAgentless=true` so the edit form
  // reads/writes through the agentless API instead of the package-policy API. Always false when
  // the agentless policies UI kill switch is off, so the page falls back to the legacy APIs.
  const isAgentless = useIsAgentlessQueryParam();

  // This read only resolves the edit UI extension, whose `useLatestPackageVersion` flag feeds
  // `forceUpgrade`. Skipping it for agentless is safe and avoids touching the package-policy API.
  const { data: packagePolicyData } = useGetOnePackagePolicyQuery(packagePolicyId, {
    enabled: !isAgentless,
  });

  const extensionView = useUIExtension(
    packagePolicyData?.item?.package?.name ?? '',
    'package-policy-edit'
  );

  const fromQs = qs.get('from');

  let from: EditPackagePolicyFrom | undefined;

  if (fromQs && fromQs === 'fleet-policy-list') {
    from = 'edit';
  } else if (fromQs && fromQs === 'installed-integrations') {
    from = 'installed-integrations';
  } else {
    from = 'package-edit';
  }

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      from={from}
      isAgentless={isAgentless}
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});
