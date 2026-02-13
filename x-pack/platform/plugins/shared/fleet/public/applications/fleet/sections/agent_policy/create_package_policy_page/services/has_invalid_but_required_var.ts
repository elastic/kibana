/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import type {
  PackagePolicyConfigRecord,
  RegistryVarsEntry,
  RegistryVarGroup,
} from '../../../../types';

import { validatePackagePolicyConfig } from '.';
import {
  shouldShowVar,
  isVarRequiredByVarGroup,
  type VarGroupSelection,
} from './var_group_helpers';

export const hasInvalidButRequiredVar = (
  registryVars?: RegistryVarsEntry[],
  packagePolicyVars?: PackagePolicyConfigRecord,
  varGroups?: RegistryVarGroup[],
  varGroupSelections?: VarGroupSelection
): boolean => {
  // if registryVars is truthy (even empty array) and
  // packagePolicyVars is falsy,
  // return true to expand streams by default when creating new policies.
  if (registryVars && !packagePolicyVars) {
    // For packages with var_groups, check if there are any visible required vars
    if (varGroups && varGroups.length > 0) {
      return registryVars.some((registryVar) => {
        if (!shouldShowVar(registryVar.name, varGroups, varGroupSelections || {})) {
          return false;
        }
        const requiredByVarGroup = isVarRequiredByVarGroup(
          registryVar.name,
          varGroups,
          varGroupSelections || {}
        );
        return registryVar.required || requiredByVarGroup;
      });
    }
    // For packages without var_groups, maintain original behavior
    return true;
  }

  if (!registryVars || !packagePolicyVars) {
    return false;
  }

  return registryVars.some((registryVar) => {
    // If var_groups exist, only validate visible vars
    if (varGroups && varGroups.length > 0) {
      if (!shouldShowVar(registryVar.name, varGroups, varGroupSelections || {})) {
        return false;
      }
    }

    // Check if var is required (either by varDef or by var_group)
    const requiredByVarGroup = isVarRequiredByVarGroup(
      registryVar.name,
      varGroups,
      varGroupSelections
    );
    const isRequired = registryVar.required || requiredByVarGroup;

    if (!isRequired) {
      return false;
    }

    // Check if the var value is missing or invalid
    if (!packagePolicyVars[registryVar.name]) {
      return true;
    }

    const validationErrors = validatePackagePolicyConfig(
      packagePolicyVars[registryVar.name],
      registryVar,
      registryVar.name,
      load,
      undefined,
      requiredByVarGroup
    );

    return validationErrors && validationErrors.length > 0;
  });
};
