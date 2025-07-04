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
  } else {
    from = 'package-edit';
  }

  return (
    <EditPackagePolicyForm
      packagePolicyId={packagePolicyId}
      from={from}
      forceUpgrade={extensionView?.useLatestPackageVersion}
    />
  );
});
