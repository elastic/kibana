/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
  RegistryVarGroup,
  RegistryVarGroupOption,
} from '../types';

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

/**
 * Deployment modes a var_group option can be hidden in. Matches the
 * `hide_in_deployment_modes` values on {@link RegistryVarGroupOption}.
 */
export type VarGroupDeploymentMode = 'agentless' | 'default';

/**
 * Whether a var_group option is hidden in the given deployment mode.
 * The form and validation must agree on this: the form's default selection is
 * the first option that is not hidden here, so validation's fallback must use
 * the same rule instead of blindly taking `options[0]`.
 */
export const isVarGroupOptionHiddenInDeploymentMode = (
  option: RegistryVarGroupOption,
  deploymentMode: VarGroupDeploymentMode | undefined
): boolean => {
  if (!deploymentMode || !option.hide_in_deployment_modes) {
    return false;
  }
  return option.hide_in_deployment_modes.includes(deploymentMode);
};

/**
 * Whether a var entry holds a value that counts as evidence of user configuration.
 *
 * `false` is excluded on purpose: boolean vars migrated from a package version that did
 * not declare them are sanitized from null to false, so a `false` value is
 * indistinguishable from a migration default and must not vote for an option.
 * Exported so the stream-var clearing in `var_group_policy_effects` uses the same
 * definition of "populated" as inference does.
 */
export const hasConfiguredVarValue = (
  entry: PackagePolicyConfigRecordEntry | undefined
): boolean => {
  const value = entry?.value;
  if (value === undefined || value === null || value === '' || value === false) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

/**
 * Infers var_group selections for a package policy that has none stored, based on which
 * option's vars are actually populated in the policy's package-level vars.
 *
 * Policies created before a package introduced var_groups have no stored
 * `var_group_selections`, so the UI would otherwise fall back to the first visible option —
 * which may not match the policy's real configuration (e.g. a Direct Access Keys policy
 * being presented as Identity Federation after an upgrade).
 *
 * For each var_group the options are scored by how many of their declared vars hold a
 * configured value; ties are broken by completeness (populated / declared), which matters
 * when one option's vars are a subset of another's (e.g. direct access keys vs temporary
 * access keys). A group with no evidence, or with an unresolvable tie, is left unselected.
 *
 * When `deploymentMode` is given, options hidden in that mode are never inferred:
 * validation and the form must agree on the default, and an option the form hides
 * cannot be the one validation checks. Callers that do not know the mode (e.g. the
 * server-side upgrade path) omit it and keep the previous unfiltered behaviour.
 *
 * @param varGroups - The var_groups from package info
 * @param vars - The policy's package-level vars to read evidence from
 * @param deploymentMode - Deployment mode to filter hidden options by, if known
 * @returns Inferred selections, or undefined when nothing could be inferred
 */
export const inferVarGroupSelections = (
  varGroups: RegistryVarGroup[] | undefined,
  vars: PackagePolicyConfigRecord | undefined,
  deploymentMode?: VarGroupDeploymentMode
): VarGroupSelection | undefined => {
  if (!varGroups || varGroups.length === 0 || !vars) {
    return undefined;
  }

  const inferred: VarGroupSelection = {};

  for (const varGroup of varGroups) {
    let bestOption: RegistryVarGroupOption | undefined;
    let bestScore = 0;
    let bestRatio = 0;
    let tied = false;

    for (const option of varGroup.options) {
      if (option.vars.length === 0) {
        continue;
      }
      if (isVarGroupOptionHiddenInDeploymentMode(option, deploymentMode)) {
        continue;
      }
      const score = option.vars.filter((name) => hasConfiguredVarValue(vars[name])).length;
      if (score === 0) {
        continue;
      }
      const ratio = score / option.vars.length;
      if (score > bestScore || (score === bestScore && ratio > bestRatio)) {
        bestOption = option;
        bestScore = score;
        bestRatio = ratio;
        tied = false;
      } else if (score === bestScore && ratio === bestRatio) {
        tied = true;
      }
    }

    if (bestOption && !tied) {
      inferred[varGroup.name] = bestOption.name;
    }
  }

  return Object.keys(inferred).length > 0 ? inferred : undefined;
};

/**
 * First option of a var_group that is visible in the given deployment mode
 * (and not in `hiddenOptionNames`, e.g. hidden for the policy template or a
 * disabled provider). This is the option the form defaults to, so it is also
 * the option validation falls back to when no selection is stored.
 * Returns undefined when every option is hidden.
 */
export const getFirstVisibleVarGroupOption = (
  varGroup: RegistryVarGroup,
  deploymentMode?: VarGroupDeploymentMode,
  hiddenOptionNames?: string[]
): RegistryVarGroupOption | undefined => {
  return varGroup.options.find(
    (option) =>
      !hiddenOptionNames?.includes(option.name) &&
      !isVarGroupOptionHiddenInDeploymentMode(option, deploymentMode)
  );
};

/**
 * Drops stored selections that name an option no longer in the group, so the group is treated as
 * having no selection. Entries for undeclared groups are kept. Returns the input when nothing is dropped.
 */
export const sanitizeVarGroupSelections = (
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection | undefined
): VarGroupSelection | undefined => {
  if (!varGroupSelections || !varGroups || varGroups.length === 0) {
    return varGroupSelections;
  }
  let dropped = false;
  const sanitized: VarGroupSelection = {};
  for (const [groupName, optionName] of Object.entries(varGroupSelections)) {
    const group = varGroups.find((g) => g.name === groupName);
    if (!group) {
      // Group no longer declared by the package: keep the entry as-is.
      sanitized[groupName] = optionName;
      continue;
    }
    if (group.options.some((option) => option.name === optionName)) {
      sanitized[groupName] = optionName;
    } else {
      dropped = true;
    }
  }
  return dropped ? sanitized : varGroupSelections;
};
