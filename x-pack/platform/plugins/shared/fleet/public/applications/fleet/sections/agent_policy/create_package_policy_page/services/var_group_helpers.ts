/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarGroup, RegistryVarGroupOption } from '../../../../types';

// Re-export generic var_group helpers from common/services
export type { VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
export {
  getSelectedOption,
  getVisibleVarsForOption,
  getVarsControlledByVarGroups,
  shouldShowVar,
  isVarRequiredByVarGroup,
  isVarInSelectedVarGroupOption,
} from '../../../../../../../common/services/var_group_helpers';

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
