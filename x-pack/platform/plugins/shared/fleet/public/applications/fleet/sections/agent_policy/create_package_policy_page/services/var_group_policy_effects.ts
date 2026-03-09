/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackagePolicyConfigRecord,
} from '../../../../../../../common';
import { SUPPORTS_CLOUD_CONNECTORS_VAR_NAME } from '../../../../../../../common/constants';
import {
  getCloudConnectorOption,
  getAllCloudConnectorVarNames,
  type VarGroupSelection,
} from '../../../../../../../common/services/cloud_connectors';
import type { RegistryVarGroup } from '../../../../types';

/**
 * Handler function type for computing policy effects based on var_group selections.
 * Returns partial policy updates or null if no updates needed.
 */
export type PolicyUpdateHandler = (
  packagePolicy: NewPackagePolicy,
  varGroupSelections: VarGroupSelection,
  varGroups: RegistryVarGroup[]
) => Partial<NewPackagePolicy> | null;

// Registry of effect handlers for extensibility
const policyUpdateHandlers: PolicyUpdateHandler[] = [];

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

function isSecretRef(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).isSecretRef === true
  );
}

/**
 * Resets cloud connector vars that hold secret references to empty strings, preserving
 * type and other metadata. Plain-text vars are left untouched so non-sensitive values
 * (e.g. role_arn) survive a var_group switch.
 * Mutates nothing — returns a new record or undefined when no changes are needed.
 */
function clearSecretVarsInRecord(
  vars: PackagePolicyConfigRecord,
  varNames: Set<string>
): PackagePolicyConfigRecord | undefined {
  let changed = false;
  const updated = { ...vars };
  for (const name of varNames) {
    if (name in updated && isSecretRef(updated[name].value)) {
      updated[name] = { ...updated[name], value: '' };
      changed = true;
    }
  }
  return changed ? updated : undefined;
}

/**
 * Builds the complete deactivation update for package-level vars in a single pass:
 * clears secret-ref cloud connector vars AND sets supports_cloud_connectors to false.
 * Avoids the merge-conflict that arises when two full-record spreads are combined.
 */
function buildDeactivatePackageVarsUpdate(
  currentVars: PackagePolicyConfigRecord | undefined,
  cloudConnectorVarNames: Set<string>
): { vars: PackagePolicyConfigRecord } | Record<string, never> {
  if (!currentVars) return {};

  let changed = false;
  const updated = { ...currentVars };

  for (const name of cloudConnectorVarNames) {
    if (name in updated && isSecretRef(updated[name].value)) {
      updated[name] = { ...updated[name], value: '' };
      changed = true;
    }
  }

  if (
    SUPPORTS_CLOUD_CONNECTORS_VAR_NAME in updated &&
    updated[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME].value !== false
  ) {
    updated[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME] = {
      ...updated[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME],
      value: false,
    };
    changed = true;
  }

  return changed ? { vars: updated } : {};
}

/**
 * Clears secret-ref cloud connector vars from input/stream-level vars.
 * Returns the full updated inputs array, or undefined when no changes are needed.
 */
function clearInputStreamVars(
  inputs: NewPackagePolicyInput[],
  cloudConnectorVarNames: Set<string>
): NewPackagePolicyInput[] | undefined {
  if (cloudConnectorVarNames.size === 0) return undefined;

  let inputsChanged = false;
  const updatedInputs: NewPackagePolicyInput[] = inputs.map((input) => {
    let inputChanged = false;

    const updatedStreams = input.streams.map((stream) => {
      if (!stream.vars) return stream;
      const clearedStreamVars = clearSecretVarsInRecord(stream.vars, cloudConnectorVarNames);
      if (clearedStreamVars) {
        inputChanged = true;
        return { ...stream, vars: clearedStreamVars };
      }
      return stream;
    });

    if (inputChanged) {
      inputsChanged = true;
      return { ...input, streams: updatedStreams };
    }
    return input;
  });

  return inputsChanged ? updatedInputs : undefined;
}

/**
 * Cloud Connector policy effect handler.
 * Sets supports_cloud_connector, cloud_connector_id, and the supports_cloud_connectors
 * package-level var based on var_group selection.
 *
 * The supports_cloud_connectors var is required for the agent's auth provider to use
 * cloud connector credential exchange. It must always be explicitly false when cloud
 * connector is not selected.
 *
 * When deactivating cloud connector, this also clears cloud-connector vars that hold
 * secret references (isSecretRef: true) at every scope — package vars, input vars,
 * and stream vars — to prevent stale secrets from leaking into agent-based mode.
 * Plain-text vars (e.g. role_arn) are preserved across the switch.
 */
export const updateCloudConnectorPolicy: PolicyUpdateHandler = (
  packagePolicy,
  varGroupSelections,
  varGroups
) => {
  const cloudConnectorOption = getCloudConnectorOption(varGroups, varGroupSelections);
  const currentVarValue = packagePolicy.vars?.[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME]?.value;

  if (cloudConnectorOption.isSelected) {
    // Only update if supports_cloud_connector flag or the var need to change.
    // cloud_connector_id is intentionally NOT checked here — once set by
    // CloudConnectorSetup it must be preserved across unrelated var_group changes.
    if (
      packagePolicy.supports_cloud_connector !== true ||
      (currentVarValue !== undefined && currentVarValue !== true)
    ) {
      return {
        supports_cloud_connector: true,
        // Only initialize cloud_connector_id when first transitioning to cloud
        // connector mode; preserve existing ID if CloudConnectorSetup already set one
        ...(packagePolicy.supports_cloud_connector !== true
          ? { cloud_connector_id: undefined }
          : {}),
        ...buildSupportsCloudConnectorsVarsUpdate(packagePolicy.vars, true),
      };
    }
  } else {
    // Cloud connector not selected - clear the flags and cloud connector vars
    if (
      packagePolicy.supports_cloud_connector === true ||
      packagePolicy.cloud_connector_id !== undefined ||
      (currentVarValue !== undefined && currentVarValue !== false)
    ) {
      const cloudConnectorVarNames = getAllCloudConnectorVarNames(varGroups);

      const updatedInputs = clearInputStreamVars(packagePolicy.inputs, cloudConnectorVarNames);

      return {
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
        ...buildDeactivatePackageVarsUpdate(packagePolicy.vars, cloudConnectorVarNames),
        ...(updatedInputs ? { inputs: updatedInputs } : {}),
      };
    }
  }

  return null;
};

// Register the built-in cloud connector handler
policyUpdateHandlers.push(updateCloudConnectorPolicy);

/**
 * Register a custom policy effect handler.
 * Handlers are called in order of registration.
 */
export function registerPolicyUpdateHandler(handler: PolicyUpdateHandler): void {
  policyUpdateHandlers.push(handler);
}

/**
 * Compute all policy effects based on the current var_group selections.
 * Aggregates results from all registered handlers (e.g., setting
 * supports_cloud_connector and supports_cloud_connectors var).
 */
export function buildVarGroupPolicyUpdates(
  packagePolicy: NewPackagePolicy,
  varGroupSelections: VarGroupSelection,
  varGroups: RegistryVarGroup[] | undefined
): Partial<NewPackagePolicy> | null {
  if (!varGroups || varGroups.length === 0) {
    return null;
  }

  let combinedEffects: Partial<NewPackagePolicy> = {};
  let hasEffects = false;

  for (const handler of policyUpdateHandlers) {
    const effects = handler(packagePolicy, varGroupSelections, varGroups);
    if (effects) {
      combinedEffects = { ...combinedEffects, ...effects };
      hasEffects = true;
    }
  }

  return hasEffects ? combinedEffects : null;
}
