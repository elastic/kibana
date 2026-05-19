import type { RegistryVarGroup, RegistryVarGroupOption } from '../types';
/**
 * Mapping of var_group names to selected option names
 */
export type VarGroupSelection = Record<string, string>;
/**
 * Gets the full RegistryVarGroupOption object for the currently selected option in a var_group.
 *
 * @param varGroup - The var_group to search
 * @param selectedOptionName - The name of the selected option
 * @returns The selected option or undefined
 */
export declare const getSelectedOption: (varGroup: RegistryVarGroup, selectedOptionName: string | undefined) => RegistryVarGroupOption | undefined;
/**
 * Get variable names that should be visible based on the selected option.
 * Returns undefined if no option is selected.
 */
export declare const getVisibleVarsForOption: (varGroup: RegistryVarGroup, selectedOptionName: string | undefined) => string[] | undefined;
/**
 * Get all variable names that are controlled by any var_group.
 * These vars should only be shown when their option is selected.
 */
export declare const getVarsControlledByVarGroups: (varGroups: RegistryVarGroup[]) => Set<string>;
/**
 * Determines if a variable should be visible based on var_group selections.
 */
export declare const shouldShowVar: (varName: string, varGroups: RegistryVarGroup[], varGroupSelections: VarGroupSelection) => boolean;
/**
 * Determines if a variable is required due to being in a required var_group's selected option.
 * When var_group.required is true, all vars in the selected option are treated as required.
 */
export declare const isVarRequiredByVarGroup: (varName: string, varGroups: RegistryVarGroup[] | undefined, varGroupSelections: VarGroupSelection | undefined) => boolean;
/**
 * Checks if a variable is part of a currently selected var_group option.
 * This is used to override show_user: false for vars that belong to a selected var_group option.
 *
 * Unlike shouldShowVar which returns true for vars NOT controlled by var_groups,
 * this function returns false for such vars - it specifically checks if a var
 * is controlled by a var_group AND is in the selected option.
 */
export declare const isVarInSelectedVarGroupOption: (varName: string, varGroups: RegistryVarGroup[], varGroupSelections: VarGroupSelection) => boolean;
