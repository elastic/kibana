/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarsEntry, RegistryVarGroup } from '../../../../types';

import { isVarInSelectedVarGroupOption, type VarGroupSelection } from './var_group_helpers';

/**
 * Determines if a variable should be shown under "Advanced options".
 *
 * A var is NOT advanced (shown by default) if:
 * - show_user is true, OR
 * - required is true AND default is undefined, OR
 * - the var is part of a currently selected var_group option (overrides show_user: false)
 *
 * @param varDef - The variable definition
 * @param varGroups - Optional var_groups from the package/stream
 * @param varGroupSelections - Optional current var_group selections
 */
export const isAdvancedVar = (
  varDef: RegistryVarsEntry,
  varGroups?: RegistryVarGroup[],
  varGroupSelections?: VarGroupSelection
): boolean => {
  // If var is in a selected var_group option, treat as non-advanced (override show_user: false)
  if (
    varGroups &&
    varGroups.length > 0 &&
    varGroupSelections &&
    isVarInSelectedVarGroupOption(varDef.name, varGroups, varGroupSelections)
  ) {
    return false;
  }

  if (varDef.show_user || (varDef.required && varDef.default === undefined)) {
    return false;
  }
  return true;
};
