/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../../../../types';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../../constants';
import { getMaxPackageName } from '../../../../../../../../common/services';
import { SO_SEARCH_LIMIT } from '../../../../../../../../common/constants';
import { packageToPackagePolicy } from '../../../../../services';
import { sendGetPackagePolicies } from '../../../../../hooks';

export const sendGeneratePackagePolicy = async (
  agentPolicyId: string,
  packageInfo: PackageInfo,
  integrationToEnable?: string
) => {
  const { data: packagePolicyData, error } = await sendGetPackagePolicies({
    perPage: SO_SEARCH_LIMIT,
    page: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageInfo.name}`,
  });

  const incrementedName = getMaxPackageName(packageInfo.name, packagePolicyData?.items);

  const defaultPolicy: NewPackagePolicy = {
    name: incrementedName,
    description: '',
    namespace: '',
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: [],
  };

  const packagePolicy = packageToPackagePolicy(
    packageInfo,
    agentPolicyId,
    defaultPolicy.namespace,
    defaultPolicy.name,
    defaultPolicy.description,
    integrationToEnable
  );

  return {
    packagePolicy,
    error,
  };
};
