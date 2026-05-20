import type { PackageInfo, RegistryInput, RegistryVarGroup, RegistryVarGroupOption } from '../../../../types';
export type { VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
import type { VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
export { getSelectedOption, getVisibleVarsForOption, getVarsControlledByVarGroups, shouldShowVar, isVarRequiredByVarGroup, isVarInSelectedVarGroupOption, } from '../../../../../../../common/services/var_group_helpers';
/**
 * Check if an input is compatible with the current var_group selections.
 * An input is incompatible (hidden) if any of its hide_in_var_group_options includes
 * the currently selected option for that var_group.
 */
export declare function isInputCompatibleWithVarGroupSelections(registryInput: RegistryInput, varGroupSelections: VarGroupSelection): boolean;
/**
 * Returns whether an input is visible for the current var_group selections.
 * When the package has no var_groups, all inputs are visible.
 * Otherwise, the input is visible if it is compatible with current selections
 * (same pattern as deployment mode: hidden inputs are disabled so validation omits them).
 */
export declare function isInputVisibleForVarGroupSelections(input: {
    type: string;
    policy_template?: string;
}, packageInfo: PackageInfo | undefined, varGroupSelections: VarGroupSelection): boolean;
/**
 * Get visible options for a var group, filtering out options that should be hidden
 * based on deployment mode or hide_in_var_group_options configuration.
 *
 * Note: This function is UI-specific as it uses isAgentlessEnabled and hideInVarGroupOptions.
 */
export declare function getVisibleOptions(varGroup: RegistryVarGroup, isAgentlessEnabled: boolean, hideInVarGroupOptions?: Record<string, string[]>): RegistryVarGroupOption[];
/**
 * Compute default selections from var_groups (first visible option for each group).
 *
 * Note: This function is UI-specific as it depends on getVisibleOptions.
 */
export declare function computeDefaultVarGroupSelections(varGroups: RegistryVarGroup[] | undefined, isAgentlessEnabled: boolean, hideInVarGroupOptions?: Record<string, string[]>): Record<string, string>;
