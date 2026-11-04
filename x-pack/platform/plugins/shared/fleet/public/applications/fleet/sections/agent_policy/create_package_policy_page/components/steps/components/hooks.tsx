/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { LICENCE_FOR_OUTPUT_PER_INTEGRATION } from '../../../../../../../../../common/constants';
import type { AgentPolicy, NewPackagePolicy } from '../../../../../../../../../common/types';
import type { RegistryVarGroup } from '../../../../../../types';
import { getAllowedOutputTypesForPackagePolicy } from '../../../../../../../../../common/services/output_helpers';
import { useGetOutputs, useLicense } from '../../../../../../hooks';

import {
  computeDefaultVarGroupSelections,
  type VarGroupSelection,
} from '../../../services/var_group_helpers';
import { buildVarGroupPolicyUpdates } from '../../../services/var_group_policy_effects';

export function useDataStreamId() {
  const history = useHistory();

  return useMemo(() => {
    const searchParams = new URLSearchParams(history.location.search);
    return searchParams.get('datastreamId') ?? undefined;
  }, [history.location.search]);
}

export function useOutputs(
  packagePolicy: Pick<NewPackagePolicy, 'supports_agentless'> & {
    inputs?: Array<{ type: string; enabled: boolean }>;
  },
  packageName: string,
  agentPolicies?: Array<Pick<AgentPolicy, 'data_output_id'>>
) {
  const licenseService = useLicense();
  const canUseOutputPerIntegration =
    licenseService.hasAtLeast(LICENCE_FOR_OUTPUT_PER_INTEGRATION) &&
    !packagePolicy.supports_agentless;
  const { data: outputsData, isLoading } = useGetOutputs();
  const allowedOutputTypes = getAllowedOutputTypesForPackagePolicy(packagePolicy);
  const allowedOutputs = useMemo(() => {
    if (!outputsData || !canUseOutputPerIntegration) {
      return [];
    }
    return outputsData.items.filter(
      (output) => allowedOutputTypes.includes(output.type) && !output.is_internal
    );
  }, [allowedOutputTypes, canUseOutputPerIntegration, outputsData]);

  // Name of the output the integration uses when it defines no override of its own: the
  // parent agent policy's data output, or the Fleet default output when that is unset.
  // Undefined when the parent policies disagree, since no single name would be accurate.
  const inheritedOutputName = useMemo(() => {
    if (!outputsData) {
      return undefined;
    }
    const defaultOutputId = outputsData.items.find((output) => output.is_default)?.id;
    const inheritedIds = new Set(
      (agentPolicies ?? []).map((policy) => policy.data_output_id ?? defaultOutputId)
    );
    if (inheritedIds.size > 1) {
      return undefined;
    }
    // No agent policy yet (create flow): a new policy inherits the Fleet default output.
    const inheritedId = inheritedIds.size === 1 ? [...inheritedIds][0] : defaultOutputId;

    return outputsData.items.find((output) => output.id === inheritedId)?.name;
  }, [agentPolicies, outputsData]);

  return {
    isLoading,
    canUseOutputPerIntegration,
    allowedOutputs,
    inheritedOutputName,
  };
}

/**
 * Update type for var group selection changes.
 * Includes var_group_selections plus any additional policy effects.
 */
interface VarGroupSelectionsUpdate {
  var_group_selections: VarGroupSelection;
  [key: string]: unknown;
}

interface UseVarGroupSelectionsParams {
  varGroups: RegistryVarGroup[] | undefined;
  savedSelections: VarGroupSelection | undefined;
  isAgentlessEnabled: boolean;
  /**
   * Callback for selection changes. Receives var_group_selections and any
   * computed policy effects (when packagePolicy is provided).
   */
  onSelectionsChange: (update: VarGroupSelectionsUpdate) => void;
  /**
   * Optional: current package policy for computing policy effects.
   * When provided along with varGroups, selection changes will compute
   * and include policy effects (e.g., supports_cloud_connector) in the update.
   * If not provided, only var_group_selections will be included in updates.
   */
  packagePolicy?: NewPackagePolicy;
}

/**
 * Hook for managing var group selections state.
 * Handles deriving current selections, initializing defaults, selection changes,
 * and computing policy effects based on selected options.
 */
export function useVarGroupSelections({
  varGroups,
  savedSelections,
  isAgentlessEnabled,
  onSelectionsChange,
  packagePolicy,
}: UseVarGroupSelectionsParams) {
  // Derive current selections from saved or compute defaults
  const selections = useMemo((): VarGroupSelection => {
    if (savedSelections) return savedSelections;
    return computeDefaultVarGroupSelections(varGroups, isAgentlessEnabled);
  }, [savedSelections, varGroups, isAgentlessEnabled]);

  // Initialize with defaults on mount if not already set
  useEffect(() => {
    if (varGroups && varGroups.length > 0 && !savedSelections) {
      const defaults = computeDefaultVarGroupSelections(varGroups, isAgentlessEnabled);
      if (Object.keys(defaults).length > 0) {
        onSelectionsChange({ var_group_selections: defaults });
      }
    }
  }, [varGroups, isAgentlessEnabled, savedSelections, onSelectionsChange]);

  // Handle selection change with policy effects computation
  const handleSelectionChange = useCallback(
    (groupName: string, optionName: string) => {
      const newSelections: VarGroupSelection = {
        ...savedSelections,
        [groupName]: optionName,
      };

      // Compute policy effects (e.g., supports_cloud_connector) if packagePolicy is provided
      const policyEffects =
        packagePolicy && varGroups
          ? buildVarGroupPolicyUpdates(packagePolicy, newSelections, varGroups)
          : null;

      // Apply selections and any policy effects together
      onSelectionsChange({
        var_group_selections: newSelections,
        ...(policyEffects || {}),
      });
    },
    [savedSelections, onSelectionsChange, packagePolicy, varGroups]
  );

  return { selections, handleSelectionChange };
}
