/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../../../../common';
import type { RegistryVarGroup } from '../../../../types';

import { getCloudConnectorOption, type VarGroupSelection } from './var_group_helpers';

/**
 * Handler function type for computing policy effects based on var_group selections.
 * Returns partial policy updates or null if no updates needed.
 */
export type PolicyEffectHandler = (
  packagePolicy: NewPackagePolicy,
  varGroupSelections: VarGroupSelection,
  varGroups: RegistryVarGroup[]
) => Partial<NewPackagePolicy> | null;

// Registry of effect handlers for extensibility
const policyEffectHandlers: PolicyEffectHandler[] = [];

/**
 * Cloud Connector policy effect handler.
 * Sets supports_cloud_connector and cloud_connector_id based on var_group selection.
 */
export const cloudConnectorPolicyEffect: PolicyEffectHandler = (
  packagePolicy,
  varGroupSelections,
  varGroups
) => {
  const cloudConnectorOption = getCloudConnectorOption(varGroups, varGroupSelections);

  if (cloudConnectorOption.isCloudConnector) {
    // Only update if values have changed
    if (
      packagePolicy.supports_cloud_connector !== true ||
      packagePolicy.cloud_connector_id !== undefined
    ) {
      return {
        supports_cloud_connector: true,
        cloud_connector_id: undefined, // Will be set by CloudConnectorSetup
      };
    }
  } else {
    // Cloud connector not selected - clear the flags if they were set
    if (
      packagePolicy.supports_cloud_connector === true ||
      packagePolicy.cloud_connector_id !== undefined
    ) {
      return {
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      };
    }
  }

  return null;
};

// Register the built-in cloud connector handler
policyEffectHandlers.push(cloudConnectorPolicyEffect);

/**
 * Register a custom policy effect handler.
 * Handlers are called in order of registration.
 */
export function registerPolicyEffectHandler(handler: PolicyEffectHandler): void {
  policyEffectHandlers.push(handler);
}

/**
 * Compute all policy effects based on the current var_group selections.
 * Aggregates results from all registered handlers.
 */
export function computePolicyEffects(
  packagePolicy: NewPackagePolicy,
  varGroupSelections: VarGroupSelection,
  varGroups: RegistryVarGroup[] | undefined
): Partial<NewPackagePolicy> | null {
  if (!varGroups || varGroups.length === 0) {
    return null;
  }

  let combinedEffects: Partial<NewPackagePolicy> = {};
  let hasEffects = false;

  for (const handler of policyEffectHandlers) {
    const effects = handler(packagePolicy, varGroupSelections, varGroups);
    if (effects) {
      combinedEffects = { ...combinedEffects, ...effects };
      hasEffects = true;
    }
  }

  return hasEffects ? combinedEffects : null;
}
