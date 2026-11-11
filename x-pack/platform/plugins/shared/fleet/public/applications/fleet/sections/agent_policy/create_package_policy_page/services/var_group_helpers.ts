/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  doesPackageHaveIntegrations,
  getNormalizedInputs,
} from '../../../../../../../common/services';
import { isInputAllowedForDeploymentMode } from '../../../../../../../common/services/agentless_policy_helper';
import { isCloudProvider } from '../../../../../../../common/types';
import type {
  CloudProvider,
  PackageInfo,
  RegistryInput,
  RegistryVarGroup,
  RegistryVarGroupOption,
} from '../../../../types';

// Re-export generic var_group helpers from common/services
export type { VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
import type { VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
export {
  getSelectedOption,
  getVisibleVarsForOption,
  getVarsControlledByVarGroups,
  shouldShowVar,
  isVarRequiredByVarGroup,
  isVarInSelectedVarGroupOption,
} from '../../../../../../../common/services/var_group_helpers';

/**
 * Check if an input is compatible with the current var_group selections.
 * An input is incompatible (hidden) if any of its hide_in_var_group_options includes
 * the currently selected option for that var_group.
 */
export function isInputCompatibleWithVarGroupSelections(
  registryInput: RegistryInput,
  varGroupSelections: VarGroupSelection
): boolean {
  if (!registryInput.hide_in_var_group_options) {
    return true;
  }

  for (const [groupName, hiddenOptions] of Object.entries(
    registryInput.hide_in_var_group_options
  )) {
    const selectedOption = varGroupSelections[groupName];
    if (selectedOption && hiddenOptions.includes(selectedOption)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns whether an input is visible for the current var_group selections.
 * When the package has no var_groups, all inputs are visible.
 * Otherwise, the input is visible if it is compatible with current selections
 * (same pattern as deployment mode: hidden inputs are disabled so validation omits them).
 */
export function isInputVisibleForVarGroupSelections(
  input: { type: string; policy_template?: string },
  packageInfo: PackageInfo | undefined,
  varGroupSelections: VarGroupSelection
): boolean {
  if (!packageInfo?.var_groups?.length) {
    return true;
  }

  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  let registryInput: RegistryInput | undefined;

  for (const policyTemplate of packageInfo.policy_templates ?? []) {
    const inputs = getNormalizedInputs(policyTemplate);
    registryInput = inputs.find(
      (i) =>
        i.type === input.type &&
        (hasIntegrations ? policyTemplate.name === input.policy_template : true)
    );
    if (registryInput) break;
  }

  if (!registryInput) {
    return true;
  }

  return isInputCompatibleWithVarGroupSelections(registryInput, varGroupSelections);
}

/**
 * Compute the var_group options to hide when the package policy form is scoped to a
 * single policy template (integration). An option is hidden when every input of that
 * policy template available in the selected deployment mode declares it in
 * `hide_in_var_group_options`, since selecting it would leave the integration without
 * any usable inputs.
 */
export function getHiddenVarGroupOptionsForPolicyTemplate(
  packageInfo: PackageInfo | undefined,
  policyTemplateName: string | undefined,
  isAgentlessEnabled: boolean
): Record<string, string[]> | undefined {
  if (!packageInfo?.var_groups?.length || !policyTemplateName) {
    return undefined;
  }

  const policyTemplate = packageInfo.policy_templates?.find(
    (template) => template.name === policyTemplateName
  );
  if (!policyTemplate) {
    return undefined;
  }

  const deploymentMode = isAgentlessEnabled ? 'agentless' : 'default';
  const inputs = getNormalizedInputs(policyTemplate).filter((input) =>
    isInputAllowedForDeploymentMode(
      { type: input.type, policy_template: policyTemplateName },
      deploymentMode,
      packageInfo
    )
  );
  if (!inputs.length) {
    return undefined;
  }

  const hiddenOptions: Record<string, string[]> = {};
  for (const varGroup of packageInfo.var_groups) {
    const hiddenOptionNames = varGroup.options
      .filter((option) =>
        inputs.every((input) =>
          input.hide_in_var_group_options?.[varGroup.name]?.includes(option.name)
        )
      )
      .map((option) => option.name);

    if (hiddenOptionNames.length > 0) {
      hiddenOptions[varGroup.name] = hiddenOptionNames;
    }
  }

  return Object.keys(hiddenOptions).length > 0 ? hiddenOptions : undefined;
}

/**
 * Compute the var_group options to hide because their cloud provider's identity federation
 * has been disabled by feature flag. An option is hidden when its `provider` is in
 * `disabledProviders`, unless it is already the saved selection for its var_group — an
 * existing policy configured with identity federation must stay editable rather than being
 * silently reset to the first visible option.
 */
export function getHiddenVarGroupOptionsForDisabledProviders(
  varGroups: RegistryVarGroup[] | undefined,
  disabledProviders: readonly CloudProvider[],
  savedSelections?: VarGroupSelection
): Record<string, string[]> | undefined {
  if (!varGroups?.length || !disabledProviders.length) {
    return undefined;
  }

  const hiddenOptions: Record<string, string[]> = {};
  for (const varGroup of varGroups) {
    const hiddenOptionNames = varGroup.options
      .filter(
        (option) =>
          isCloudProvider(option.provider) &&
          disabledProviders.includes(option.provider) &&
          savedSelections?.[varGroup.name] !== option.name
      )
      .map((option) => option.name);

    if (hiddenOptionNames.length > 0) {
      hiddenOptions[varGroup.name] = hiddenOptionNames;
    }
  }

  return Object.keys(hiddenOptions).length > 0 ? hiddenOptions : undefined;
}

/**
 * Merge several hide-option maps (var_group name → hidden option names), deduplicating names.
 * Returns undefined when nothing is hidden so callers can keep passing `undefined` through.
 */
export function mergeHiddenVarGroupOptions(
  ...maps: Array<Record<string, string[]> | undefined>
): Record<string, string[]> | undefined {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [groupName, optionNames] of Object.entries(map ?? {})) {
      merged[groupName] = [...new Set([...(merged[groupName] ?? []), ...optionNames])];
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Get visible options for a var group, filtering out options that should be hidden
 * based on deployment mode or hide_in_var_group_options configuration.
 *
 * Note: This function is UI-specific as it uses isAgentlessEnabled and hideInVarGroupOptions.
 */
export function getVisibleOptions(
  varGroup: RegistryVarGroup,
  isAgentlessEnabled: boolean,
  hideInVarGroupOptions?: Record<string, string[]>
): RegistryVarGroupOption[] {
  const hiddenOptionNames = hideInVarGroupOptions?.[varGroup.name] ?? [];

  return varGroup.options.filter((option) => {
    // Check if option is hidden via hide_in_var_group_options
    if (hiddenOptionNames.includes(option.name)) {
      return false;
    }

    // Check if option is hidden based on deployment mode
    if (option.hide_in_deployment_modes) {
      if (isAgentlessEnabled && option.hide_in_deployment_modes.includes('agentless')) {
        return false;
      }
      if (!isAgentlessEnabled && option.hide_in_deployment_modes.includes('default')) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute default selections from var_groups (first visible option for each group).
 *
 * Note: This function is UI-specific as it depends on getVisibleOptions.
 */
export function computeDefaultVarGroupSelections(
  varGroups: RegistryVarGroup[] | undefined,
  isAgentlessEnabled: boolean,
  hideInVarGroupOptions?: Record<string, string[]>
): Record<string, string> {
  const defaults: Record<string, string> = {};
  if (varGroups) {
    for (const varGroup of varGroups) {
      const visibleOptions = getVisibleOptions(varGroup, isAgentlessEnabled, hideInVarGroupOptions);
      if (visibleOptions.length > 0) {
        defaults[varGroup.name] = visibleOptions[0].name;
      }
    }
  }
  return defaults;
}
