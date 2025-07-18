/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTLESS_DISABLED_INPUTS } from '../constants';
import { PackagePolicyValidationError } from '../errors';
import type { NewPackagePolicyInput, PackageInfo, RegistryPolicyTemplate } from '../types';

export interface RegistryInputForDeploymentMode {
  type: string;
  policy_template?: string;
  deployment_modes?: string[];
}

/**
 * Extract registry inputs from package info for deployment mode checking.
 * Keyed by both input type and policy template name.
 */
function extractRegistryInputsForDeploymentMode(
  packageInfo?: Pick<PackageInfo, 'policy_templates'>
): RegistryInputForDeploymentMode[] {
  const inputs: RegistryInputForDeploymentMode[] = [];

  packageInfo?.policy_templates?.forEach((template) => {
    if ('inputs' in template && template.inputs) {
      template.inputs.forEach((input) => {
        if (!inputs.find((i) => i.type === input.type && i.policy_template === template.name)) {
          inputs.push({
            type: input.type,
            policy_template: template.name,
            deployment_modes: input.deployment_modes,
          });
        }
      });
    }
  });

  return inputs;
}

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
  packageInfo?: Pick<PackageInfo, 'policy_templates'>,
  integrationToEnable?: string
) => {
  if (
    packageInfo &&
    packageInfo.policy_templates &&
    packageInfo.policy_templates?.length > 0 &&
    ((integrationToEnable &&
      packageInfo.policy_templates?.find(
        (p) => p.name === integrationToEnable && isOnlyAgentlessPolicyTemplate(p)
      )) ||
      packageInfo.policy_templates?.every((p) => isOnlyAgentlessPolicyTemplate(p)))
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
 * Check if an input is allowed for a specific deployment mode based on its deployment_modes property.
 * If deployment_modes is not present, check against the input type blocklist instead.
 */
export function isInputAllowedForDeploymentMode(
  input: Pick<NewPackagePolicyInput, 'type' | 'policy_template'>,
  deploymentMode: 'default' | 'agentless',
  packageInfo?: PackageInfo
): boolean {
  // Always allow system package for monitoring, if this is not excluded it will be blocked
  // by the following code because it contains `logfile` input which is in the blocklist.
  if (packageInfo?.name === 'system') {
    return true;
  }

  // Find the registry input definition for this input type and policy template
  const registryInput = extractRegistryInputsForDeploymentMode(packageInfo).find(
    (rInput) =>
      rInput.type === input.type &&
      (input.policy_template ? input.policy_template === rInput.policy_template : true)
  );

  // If deployment_modes is specified in the registry, use it
  if (registryInput?.deployment_modes && Array.isArray(registryInput.deployment_modes)) {
    return registryInput.deployment_modes.includes(deploymentMode);
  }

  // For backward compatibility, if deployment_modes is not specified:
  // - For agentless mode, check the blocklist
  // - For default mode, allow all inputs
  if (deploymentMode === 'agentless') {
    return !AGENTLESS_DISABLED_INPUTS.includes(input.type);
  }

  return true; // Allow all inputs for default mode when deployment_modes is not specified
}

/*
 * Throw error if trying to enabling an input that is not allowed in agentless
 */
export function validateDeploymentModesForInputs(
  inputs: Array<Pick<NewPackagePolicyInput, 'type' | 'enabled' | 'policy_template'>>,
  deploymentMode: 'default' | 'agentless',
  packageInfo?: PackageInfo
) {
  inputs.forEach((input) => {
    if (input.enabled && !isInputAllowedForDeploymentMode(input, deploymentMode, packageInfo)) {
      throw new PackagePolicyValidationError(
        `Input ${input.type}${
          packageInfo?.name ? ` in ${packageInfo.name}` : ''
        } is not allowed for deployment mode '${deploymentMode}'`
      );
    }
  });
}
