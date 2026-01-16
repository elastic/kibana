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

import {
  shouldShowVar,
  isVarRequiredByVarGroup,
  type VarGroupSelection,
} from '../components/steps/components';

import { validatePackagePolicyConfig } from '.';

export const hasInvalidButRequiredVar = (
  registryVars?: RegistryVarsEntry[],
  packagePolicyVars?: PackagePolicyConfigRecord,
  varGroups?: RegistryVarGroup[],
  varGroupSelections?: VarGroupSelection
): boolean => {
  if (!registryVars) {
    return false;
  }

  if (!packagePolicyVars) {
    // Check if there are any required vars that need validation
    return registryVars.some((registryVar) => {
      // If var_groups exist, only check visible vars
      if (varGroups && varGroups.length > 0) {
        if (!shouldShowVar(registryVar.name, varGroups, varGroupSelections || {})) {
          return false;
        }
        // Check if required by var_group
        const requiredByVarGroup = isVarRequiredByVarGroup(
          registryVar.name,
          varGroups,
          varGroupSelections || {}
        );
        return registryVar.required || requiredByVarGroup;
      }
      return registryVar.required;
    });
  }

  return registryVars.some((registryVar) => {
    // If var_groups exist, only validate visible vars
    if (varGroups && varGroups.length > 0) {
      if (!shouldShowVar(registryVar.name, varGroups, varGroupSelections || {})) {
        return false;
      }
    }

    // Check if var is required (either by varDef or by var_group)
    const requiredByVarGroup =
      varGroups && varGroups.length > 0
        ? isVarRequiredByVarGroup(registryVar.name, varGroups, varGroupSelections || {})
        : false;
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
