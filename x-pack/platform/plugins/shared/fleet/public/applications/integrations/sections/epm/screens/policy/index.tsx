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
import { useGetOnePackagePolicyQuery, useUIExtension } from '../../../../hooks';
import { IS_AGENTLESS_QUERY_PARAM } from '../../../../../../../common/constants';

export const Policy = memo(() => {
  const {
    params: { packagePolicyId },
  } = useRouteMatch<{ packagePolicyId: string }>();

  const { search } = useLocation();
  const { data: packagePolicyData } = useGetOnePackagePolicyQuery(packagePolicyId);

  const extensionView = useUIExtension(
    packagePolicyData?.item?.package?.name ?? '',
    'package-policy-edit'
  );

  const qs = new URLSearchParams(search);
  const fromQs = qs.get('from');

  let from: EditPackagePolicyFrom | undefined;

  if (fromQs && fromQs === 'fleet-policy-list') {
    from = 'edit';
  } else if (fromQs && fromQs === 'installed-integrations') {
    from = 'installed-integrations';
  } else {
    from = 'package-edit';
  }

  // Detect-before-read hint: agentless surfaces append `isAgentless=true` so the edit form
  // reads/writes through the agentless API instead of the package-policy API.
  const isAgentless = qs.get(IS_AGENTLESS_QUERY_PARAM) === 'true';

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      from={from}
      isAgentless={isAgentless}
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});
