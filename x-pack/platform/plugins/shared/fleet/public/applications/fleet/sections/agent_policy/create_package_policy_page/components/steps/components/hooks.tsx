/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { LICENCE_FOR_OUTPUT_PER_INTEGRATION } from '../../../../../../../../../common/constants';
import type { NewPackagePolicy, PackagePolicy } from '../../../../../../../../../common/types';
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
  packagePolicy: Pick<PackagePolicy, 'supports_agentless'>,
  packageName: string
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
  return {
    isLoading,
    canUseOutputPerIntegration,
    allowedOutputs,
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
