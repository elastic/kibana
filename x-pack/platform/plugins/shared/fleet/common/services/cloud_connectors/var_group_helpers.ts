/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCloudProvider, type CloudProvider } from '../../types';
import type { AccountType } from '../../types/models/cloud_connector';
import type { NewPackagePolicy, NewPackagePolicyInput } from '../../types';
import type { RegistryVarGroup } from '../../types/models/package_spec';
import {
  AWS_ACCOUNT_TYPE_VAR_NAME,
  AZURE_ACCOUNT_TYPE_VAR_NAME,
  GCP_ACCOUNT_TYPE_VAR_NAME,
  SINGLE_ACCOUNT,
} from '../../constants/cloud_connector';

import { getSelectedOption, type VarGroupSelection } from '../var_group_helpers';

// Re-export generic var_group helpers from common/services
export { getSelectedOption, type VarGroupSelection } from '../var_group_helpers';

/**
 * Result of checking if a cloud connector option is selected
 */
export interface CloudConnectorOptionResult {
  /** Whether a cloud connector option is currently selected */
  isSelected: boolean;
  /** The cloud provider (e.g., 'aws', 'azure') if cloud connector is selected */
  provider?: CloudProvider;
}

/**
 * Checks if any selected var_group option has a `provider` field, indicating Cloud Connector support.
 * Returns the provider value if found.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns Object indicating if cloud connector is selected and the provider
 */
export const getCloudConnectorOption = (
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection
): CloudConnectorOptionResult => {
  if (!varGroups || varGroups.length === 0) {
    return { isSelected: false };
  }

  for (const varGroup of varGroups) {
    const selectedName = varGroupSelections[varGroup.name];
    if (!selectedName) {
      continue;
    }

    const selectedOption = getSelectedOption(varGroup, selectedName);
    if (selectedOption && isCloudProvider(selectedOption.provider)) {
      return {
        isSelected: true,
        provider: selectedOption.provider,
      };
    }
  }
  return { isSelected: false };
};

/**
 * Gets the variable names that belong to the selected cloud connector option.
 * These vars are handled by the CloudConnectorSetup component and should be hidden
 * from the regular var fields UI to prevent duplicate inputs.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns Set of variable names handled by cloud connector
 */
export const getCloudConnectorVars = (
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection
): Set<string> => {
  if (!varGroups || varGroups.length === 0) {
    return new Set();
  }

  for (const varGroup of varGroups) {
    const selectedName = varGroupSelections[varGroup.name];
    if (!selectedName) {
      continue;
    }

    const selectedOption = getSelectedOption(varGroup, selectedName);
    if (selectedOption?.provider) {
      return new Set(selectedOption.vars);
    }
  }
  return new Set();
};

/**
 * Gets the iac_template_url from the currently selected var_group option.
 * This is used for Fleet integrations that store IaC template URLs (CloudFormation, ARM)
 * as properties on the var_group option rather than in input.vars.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns The IaC template URL or undefined
 */
export const getIacTemplateUrlFromVarGroupSelection = (
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection
): string | undefined => {
  if (!varGroups || varGroups.length === 0) {
    return undefined;
  }

  for (const varGroup of varGroups) {
    const selectedName = varGroupSelections[varGroup.name];
    if (!selectedName) {
      continue;
    }

    const selectedOption = getSelectedOption(varGroup, selectedName);
    if (selectedOption?.iac_template_url) {
      return selectedOption.iac_template_url as string;
    }
  }
  return undefined;
};

const ACCOUNT_TYPE_VAR_NAMES: Record<string, string> = {
  aws: AWS_ACCOUNT_TYPE_VAR_NAME,
  azure: AZURE_ACCOUNT_TYPE_VAR_NAME,
  gcp: GCP_ACCOUNT_TYPE_VAR_NAME,
};

/**
 * Resolves the account type from var_group scope or package policy inputs.
 *
 * When var_groups are defined, the account type var must be within the selected option's
 * vars scope to be read. When var_groups are undefined (legacy integrations), reads
 * directly from package policy inputs as a fallback. Always defaults to 'single-account'.
 *
 * @param provider - The cloud provider (aws, azure, gcp)
 * @param varGroups - The var_groups from package info
 * @param cloudConnectorVars - Set of var names scoped to the selected var_group option
 * @param inputs - The package policy inputs
 * @returns The resolved account type, always defaults to 'single-account'
 */
export const getAccountTypeFromVarGroupOrInputs = (
  provider: CloudProvider | undefined,
  varGroups: RegistryVarGroup[] | undefined,
  cloudConnectorVars: Set<string>,
  inputs: NewPackagePolicyInput[] | undefined
): AccountType => {
  const varName = provider ? ACCOUNT_TYPE_VAR_NAMES[provider] : undefined;

  if (varName && !(varGroups && !cloudConnectorVars.has(varName))) {
    for (const input of inputs ?? []) {
      if (input.enabled && input.vars?.[varName]?.value) {
        return input.vars[varName].value as AccountType;
      }
    }
  }

  return SINGLE_ACCOUNT as AccountType;
};

/**
 * Returns all variable names that belong to any cloud connector option across all var_groups.
 * Unlike getCloudConnectorVars (which only returns vars for the currently selected option),
 * this returns vars from ALL options with a `provider` field, regardless of selection state.
 *
 * Used to identify vars that need to be cleared when switching away from cloud connector.
 */
export const getAllCloudConnectorVarNames = (
  varGroups: RegistryVarGroup[] | undefined
): Set<string> => {
  const varNames = new Set<string>();
  if (!varGroups) return varNames;

  for (const varGroup of varGroups) {
    if (!varGroup.options) continue;
    for (const option of varGroup.options) {
      if (option.provider && option.vars) {
        for (const varName of option.vars) {
          varNames.add(varName);
        }
      }
    }
  }
  return varNames;
};

/**
 * Detects the target cloud provider from either:
 * 1. var_group selections (new approach - provider field in selected option)
 * 2. Input type matching (legacy approach - input.type contains aws|azure|gcp)
 *
 * @param packagePolicy - The package policy to check
 * @param varGroups - The var_groups from package info
 * @returns The detected cloud provider or undefined
 */
export const detectTargetCsp = (
  packagePolicy: NewPackagePolicy,
  varGroups: RegistryVarGroup[] | undefined
): CloudProvider | undefined => {
  // First, check var_group selections for provider field (new approach)
  if (varGroups && packagePolicy.var_group_selections) {
    const cloudConnectorOption = getCloudConnectorOption(
      varGroups,
      packagePolicy.var_group_selections
    );
    if (cloudConnectorOption.isSelected && cloudConnectorOption.provider) {
      return cloudConnectorOption.provider;
    }
  }

  // Fallback to legacy input type detection
  const input = packagePolicy.inputs?.find(
    (pinput: NewPackagePolicyInput) => pinput.enabled === true
  );
  const match = input?.type.match(/aws|azure|gcp/)?.[0];
  if (isCloudProvider(match)) {
    return match;
  }
  return undefined;
};
