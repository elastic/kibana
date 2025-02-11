/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/common/types';

import type { AgentPolicy } from '../types';

import { agentPolicyWithoutPaidFeatures } from './generate_new_agent_policy';

function isAgentTamperingPolicyValidForLicense(
  policy: Partial<AgentPolicy>,
  license: ILicense | null
) {
  if (license && license.hasAtLeast('platinum')) {
    // platinum allows agent tamper protection
    return true;
  }

  const defaults = agentPolicyWithoutPaidFeatures(policy);

  // only platinum or higher may modify agent tampering
  if (policy.is_protected !== defaults.is_protected) {
    return false;
  }

  return true;
}

export const isAgentPolicyValidForLicense = (
  policy: Partial<AgentPolicy>,
  license: ILicense | null
): boolean => {
  return isAgentTamperingPolicyValidForLicense(policy, license);
};

/**
 * Resets paid features in a AgentPolicy back to default values
 * when unsupported by the given license level.
 */
export const unsetAgentPolicyAccordingToLicenseLevel = (
  policy: Partial<AgentPolicy>,
  license: ILicense | null
): Partial<AgentPolicy> => {
  if (license && license.hasAtLeast('platinum')) {
    return policy;
  }

  // set any license-gated features back to the defaults
  return agentPolicyWithoutPaidFeatures(policy);
};
