/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarGroup, RegistryVarGroupOption } from '../../types/models/package_spec';

/**
 * Mapping of var_group names to selected option names
 */
export interface VarGroupSelection {
  [groupName: string]: string;
}

/**
 * Result of checking if a cloud connector option is selected
 */
export interface CloudConnectorOptionResult {
  /** Whether a cloud connector option is currently selected */
  isCloudConnector: boolean;
  /** The cloud provider (e.g., 'aws', 'azure') if cloud connector is selected */
  provider?: string;
}

/**
 * Gets the full RegistryVarGroupOption object for the currently selected option in a var_group.
 *
 * @param varGroup - The var_group to search
 * @param selectedOptionName - The name of the selected option
 * @returns The selected option or undefined
 */
export const getSelectedOption = (
  varGroup: RegistryVarGroup,
  selectedOptionName: string | undefined
): RegistryVarGroupOption | undefined => {
  if (!selectedOptionName) {
    return undefined;
  }
  return varGroup.options.find((opt) => opt.name === selectedOptionName);
};

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
    return { isCloudConnector: false };
  }

  for (const varGroup of varGroups) {
    const selectedName = varGroupSelections[varGroup.name];
    if (!selectedName) {
      continue;
    }

    const selectedOption = getSelectedOption(varGroup, selectedName);
    if (selectedOption?.provider) {
      return {
        isCloudConnector: true,
        provider: selectedOption.provider as string,
      };
    }
  }
  return { isCloudConnector: false };
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
