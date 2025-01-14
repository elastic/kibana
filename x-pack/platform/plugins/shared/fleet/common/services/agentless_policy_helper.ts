/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTLESS_DISABLED_INPUTS } from '../constants';
import { PackagePolicyValidationError } from '../errors';
import type {
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicyInput,
  RegistryPolicyTemplate,
} from '../types';

export const isAgentlessIntegration = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> | undefined
) => {
  if (
    packageInfo?.policy_templates &&
    packageInfo?.policy_templates.length > 0 &&
    !!packageInfo?.policy_templates.find(
      (policyTemplate) => policyTemplate?.deployment_modes?.agentless.enabled === true
    )
  ) {
    return true;
  }
  return false;
};

export const getAgentlessAgentPolicyNameFromPackagePolicyName = (packagePolicyName: string) => {
  return `Agentless policy for ${packagePolicyName}`;
};

export const isOnlyAgentlessIntegration = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> | undefined
) => {
  if (
    packageInfo?.policy_templates &&
    packageInfo?.policy_templates.length > 0 &&
    packageInfo?.policy_templates.every((policyTemplate) =>
      isOnlyAgentlessPolicyTemplate(policyTemplate)
    )
  ) {
    return true;
  }
  return false;
};

export const isOnlyAgentlessPolicyTemplate = (policyTemplate: RegistryPolicyTemplate) => {
  return Boolean(
    policyTemplate.deployment_modes &&
      policyTemplate.deployment_modes.agentless.enabled === true &&
      (!policyTemplate.deployment_modes.default ||
        policyTemplate.deployment_modes.default.enabled === false)
  );
};

/*
 * Check if the package policy inputs is not allowed in agentless
 */
export function inputNotAllowedInAgentless(
  packagePolicyInput: PackagePolicyInput | NewPackagePolicyInput,
  supportsAgentless?: boolean | null
) {
  return supportsAgentless === true && AGENTLESS_DISABLED_INPUTS.includes(packagePolicyInput.type);
}

/*
 * Throw error if trying to enabling an input that is not allowed in agentless
 */
export function checkAgentlessInputs(
  packagePolicyInputs: NewPackagePolicyInput[],
  supportsAgentless?: boolean | null
) {
  return packagePolicyInputs.forEach((input) => {
    if (inputNotAllowedInAgentless(input, supportsAgentless) && input.enabled === true) {
      throw new PackagePolicyValidationError(
        `Input ${input.type} is not allowed: types '${AGENTLESS_DISABLED_INPUTS.map(
          (name) => name
        ).join(', ')}' cannot be enabled for an Agentless integration`
      );
    }
  });
}
