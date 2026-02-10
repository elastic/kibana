/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackagePolicyConfigRecord } from '../../../../../../../common';
import { SUPPORTS_CLOUD_CONNECTORS_VAR_NAME } from '../../../../../../../common/constants';
import {
  getCloudConnectorOption,
  type VarGroupSelection,
} from '../../../../../../../common/services/cloud_connectors';
import type { RegistryVarGroup } from '../../../../types';

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
 * Builds a vars update that sets the supports_cloud_connectors package-level var.
 * Returns an empty object if the var doesn't exist in the current policy vars
 * (meaning the integration doesn't declare it in its manifest).
 */
function buildSupportsCloudConnectorsVarsUpdate(
  currentVars: PackagePolicyConfigRecord | undefined,
  value: boolean
): { vars: PackagePolicyConfigRecord } | Record<string, never> {
  if (!currentVars || !(SUPPORTS_CLOUD_CONNECTORS_VAR_NAME in currentVars)) {
    return {};
  }

  return {
    vars: {
      ...currentVars,
      [SUPPORTS_CLOUD_CONNECTORS_VAR_NAME]: {
        ...currentVars[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME],
        value,
      },
    },
  };
}

/**
 * Cloud Connector policy effect handler.
 * Sets supports_cloud_connector, cloud_connector_id, and the supports_cloud_connectors
 * package-level var based on var_group selection.
 *
 * The supports_cloud_connectors var is required for the agent's auth provider to use
 * cloud connector credential exchange. It must always be explicitly false when cloud
 * connector is not selected.
 */
export const cloudConnectorPolicyEffect: PolicyEffectHandler = (
  packagePolicy,
  varGroupSelections,
  varGroups
) => {
  const cloudConnectorOption = getCloudConnectorOption(varGroups, varGroupSelections);
  const currentVarValue = packagePolicy.vars?.[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME]?.value;

  if (cloudConnectorOption.isCloudConnector) {
    // Only update if values have changed
    if (
      packagePolicy.supports_cloud_connector !== true ||
      packagePolicy.cloud_connector_id !== undefined ||
      (currentVarValue !== undefined && currentVarValue !== true)
    ) {
      return {
        supports_cloud_connector: true,
        cloud_connector_id: undefined, // Will be set by CloudConnectorSetup
        ...buildSupportsCloudConnectorsVarsUpdate(packagePolicy.vars, true),
      };
    }
  } else {
    // Cloud connector not selected - clear the flags if they were set
    if (
      packagePolicy.supports_cloud_connector === true ||
      packagePolicy.cloud_connector_id !== undefined ||
      (currentVarValue !== undefined && currentVarValue !== false)
    ) {
      return {
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
        ...buildSupportsCloudConnectorsVarsUpdate(packagePolicy.vars, false),
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
