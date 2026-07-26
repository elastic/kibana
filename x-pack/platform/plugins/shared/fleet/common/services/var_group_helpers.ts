/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * Get variable names that should be visible based on the selected option.
 * Returns undefined if no option is selected.
 */
export const getVisibleVarsForOption = (
  varGroup: RegistryVarGroup,
  selectedOptionName: string | undefined
): string[] | undefined => {
  if (!selectedOptionName) {
    return undefined;
  }

  const selectedOption = varGroup.options.find((opt) => opt.name === selectedOptionName);
  return selectedOption?.vars;
};

/**
 * Get all variable names that are controlled by any var_group.
 * These vars should only be shown when their option is selected.
 */
export const getVarsControlledByVarGroups = (varGroups: RegistryVarGroup[]): Set<string> => {
  return new Set(varGroups.flatMap((group) => group.options.flatMap((option) => option.vars)));
};

/**
 * Determines if a variable should be visible based on var_group selections.
 */
export const shouldShowVar = (
  varName: string,
  varGroups: RegistryVarGroup[],
  varGroupSelections: VarGroupSelection
): boolean => {
  // Get all vars controlled by var_groups
  const controlledVars = getVarsControlledByVarGroups(varGroups);

  // If this var is not controlled by any var_group, always show it
  if (!controlledVars.has(varName)) {
    return true;
  }

  // Check if this var is in the selected option for any var_group
  return varGroups
    .filter((group) => varGroupSelections[group.name])
    .some((group) => {
      const selectedOption = group.options.find(
        (opt) => opt.name === varGroupSelections[group.name]
      );
      return selectedOption?.vars.includes(varName);
    });
};

/**
 * Determines if a variable is required due to being in a required var_group's selected option.
 * When var_group.required is true, all vars in the selected option are treated as required.
 */
export const isVarRequiredByVarGroup = (
  varName: string,
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection | undefined
): boolean => {
  if (!varGroups || varGroups.length === 0 || !varGroupSelections) {
    return false;
  }

  return varGroups
    .filter((group) => group.required && varGroupSelections[group.name])
    .some((group) => {
      const selectedOption = group.options.find(
        (opt) => opt.name === varGroupSelections[group.name]
      );
      return selectedOption?.vars.includes(varName);
    });
};

/**
 * Checks if a variable is part of a currently selected var_group option.
 * This is used to override show_user: false for vars that belong to a selected var_group option.
 *
 * Unlike shouldShowVar which returns true for vars NOT controlled by var_groups,
 * this function returns false for such vars - it specifically checks if a var
 * is controlled by a var_group AND is in the selected option.
 */
export const isVarInSelectedVarGroupOption = (
  varName: string,
  varGroups: RegistryVarGroup[],
  varGroupSelections: VarGroupSelection
): boolean => {
  const controlledVars = getVarsControlledByVarGroups(varGroups);

  // If not controlled by any var_group, it's not "in a selected option"
  if (!controlledVars.has(varName)) {
    return false;
  }

  // If controlled and shouldShowVar returns true, it means it's in a selected option
  return shouldShowVar(varName, varGroups, varGroupSelections);
};
