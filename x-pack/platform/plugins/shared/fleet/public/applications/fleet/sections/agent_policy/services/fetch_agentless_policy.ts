/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendGetAgentlessPolicy,
  sendGetPackageInfoByKeyForRq,
  sendGetSettings,
} from '../../../hooks';
import type { NewPackagePolicy, PackageInfo } from '../../../types';
import type { AgentlessPolicy } from '../../../../../../common/types/models/agentless_policy';
import { agentlessPolicyToPackagePolicy } from '../../../../../../common/services';

/**
 * Read an agentless policy through the agentless API and expand it into the full package-policy
 * shape the shared form components expect: GET the agentless policy, resolve prerelease from
 * settings, GET the full package info for the policy's package version, and run the inverse
 * mapper (`agentlessPolicyToPackagePolicy`).
 *
 * Shared by the edit and copy read paths (detect-before-read via the `isAgentless` link hint),
 * which must not touch the package-policy/agent-policy APIs. The requests throw on failure
 * (`sendRequestForRq` style) so callers surface the real error rather than a generic one.
 */
export const fetchAgentlessPolicyAsPackagePolicy = async (
  packagePolicyId: string
): Promise<{
  agentlessPolicy: AgentlessPolicy;
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
}> => {
  const { item: agentlessPolicy } = await sendGetAgentlessPolicy(packagePolicyId);

  const { data: settings } = await sendGetSettings();
  const prerelease = Boolean(settings?.item.prerelease_integrations_enabled);

  const { item: packageInfo } = await sendGetPackageInfoByKeyForRq(
    agentlessPolicy.package.name,
    agentlessPolicy.package.version,
    { prerelease, full: true }
  );

  return {
    agentlessPolicy,
    packageInfo,
    packagePolicy: agentlessPolicyToPackagePolicy(agentlessPolicy, packageInfo),
  };
};
