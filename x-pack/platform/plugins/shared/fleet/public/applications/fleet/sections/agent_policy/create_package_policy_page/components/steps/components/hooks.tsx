/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { LICENCE_FOR_OUTPUT_PER_INTEGRATION } from '../../../../../../../../../common/constants';
import type { PackagePolicy } from '../../../../../../../../../common/types';
import type { RegistryVarGroup } from '../../../../../../types';
import { getAllowedOutputTypesForPackagePolicy } from '../../../../../../../../../common/services/output_helpers';
import { useGetOutputs, useLicense } from '../../../../../../hooks';

import {
  computeDefaultVarGroupSelections,
  type VarGroupSelection,
} from '../../../services/var_group_helpers';

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

interface UseVarGroupSelectionsParams {
  varGroups: RegistryVarGroup[] | undefined;
  savedSelections: VarGroupSelection | undefined;
  isAgentlessEnabled: boolean;
  onSelectionsChange: (update: { var_group_selections: VarGroupSelection }) => void;
}

/**
 * Hook for managing var group selections state.
 * Handles deriving current selections, initializing defaults, and selection changes.
 */
export function useVarGroupSelections({
  varGroups,
  savedSelections,
  isAgentlessEnabled,
  onSelectionsChange,
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

  // Handle selection change
  const handleSelectionChange = useCallback(
    (groupName: string, optionName: string) => {
      onSelectionsChange({
        var_group_selections: {
          ...savedSelections,
          [groupName]: optionName,
        },
      });
    },
    [savedSelections, onSelectionsChange]
  );

  return { selections, handleSelectionChange };
}
