/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENTLESS_DISABLED_INPUTS,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
} from '../constants';
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

// Checks if a package has a policy template that supports agentless
// Provide a specific integration policy template name to check if it alone supports agentless
export const isAgentlessIntegration = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> | undefined,
  integrationToEnable?: string
) => {
  if (integrationToEnable) {
    return Boolean(
      packageInfo?.policy_templates?.find(({ name }) => name === integrationToEnable)
        ?.deployment_modes?.agentless?.enabled === true
    );
  }

  return Boolean(
    packageInfo?.policy_templates?.some(
      (policyTemplate) => policyTemplate?.deployment_modes?.agentless?.enabled === true
    )
  );
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
      policyTemplate.deployment_modes.agentless?.enabled === true &&
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

  // Check first if policy_template for input supports the deployment type
  if (
    packageInfo &&
    input.policy_template &&
    !integrationSupportsDeploymentMode(deploymentMode, packageInfo, input.policy_template)
  ) {
    return false;
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

const integrationSupportsDeploymentMode = (
  deploymentMode: string,
  packageInfo: PackageInfo,
  integrationName: string
) => {
  if (deploymentMode === 'agentless') {
    return isAgentlessIntegration(packageInfo, integrationName);
  }

  const integration = packageInfo.policy_templates?.find(({ name }) => name === integrationName);

  if (integration?.deployment_modes?.default) {
    return integration.deployment_modes?.default.enabled;
  }

  return true;
};

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

/**
 * Derive global data tags for agentless agent policies from package agentless info.
 */
export const getAgentlessGlobalDataTags = (packageInfo?: PackageInfo) => {
  if (
    !packageInfo?.policy_templates &&
    !packageInfo?.policy_templates?.some((policy) => policy.deployment_modes)
  ) {
    return undefined;
  }
  const agentlessPolicyTemplate = packageInfo.policy_templates.find(
    (policy) => policy.deployment_modes
  );

  // assumes that all the policy templates agentless deployments modes indentify have the same organization, division and team
  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;
  if (
    agentlessInfo === undefined ||
    !agentlessInfo.organization ||
    !agentlessInfo.division ||
    !agentlessInfo.team
  ) {
    return undefined;
  }

  return [
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
      value: agentlessInfo.organization,
    },
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
      value: agentlessInfo.division,
    },
    {
      name: AGENTLESS_GLOBAL_TAG_NAME_TEAM,
      value: agentlessInfo.team,
    },
  ];
};
