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

import type { SimplifiedInputs } from './simplified_package_policy_helper';

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
 * Check if the package policy inputs is not allowed in agentless
 */
export function inputNotAllowedInAgentless(inputType: string, supportsAgentless?: boolean | null) {
  return supportsAgentless === true && AGENTLESS_DISABLED_INPUTS.includes(inputType);
}

/*
 * Throw error if trying to enabling an input that is not allowed in agentless
 */
export function validateAgentlessInputs(
  packagePolicyInputs: NewPackagePolicyInput[] | SimplifiedInputs,
  supportsAgentless?: boolean | null
) {
  if (Array.isArray(packagePolicyInputs)) {
    packagePolicyInputs.forEach((input) => {
      throwIfInputNotAllowed(input.type, input.enabled, supportsAgentless);
    });
  } else {
    Object.keys(packagePolicyInputs).forEach((inputName) => {
      const input = packagePolicyInputs[inputName];
      const match = inputName.match(/\-(\w*)$/);
      const inputType = match && match.length > 0 ? match[1] : '';
      throwIfInputNotAllowed(inputType, input?.enabled ?? false, supportsAgentless);
    });
  }
}

function throwIfInputNotAllowed(
  inputType: string,
  inputEnabled: boolean,
  supportsAgentless?: boolean | null
) {
  if (inputNotAllowedInAgentless(inputType, supportsAgentless) && inputEnabled === true) {
    throw new PackagePolicyValidationError(
      `Input ${inputType} is not allowed: types '${AGENTLESS_DISABLED_INPUTS.map(
        (name) => name
      ).join(', ')}' cannot be enabled for an Agentless integration`
    );
  }
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
