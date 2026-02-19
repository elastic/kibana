/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';

import type { NewPackagePolicy, RegistryVarGroup } from '../../common';
import {
  getCloudConnectorOption,
  getCloudConnectorVars,
  getIacTemplateUrlFromVarGroupSelection,
  type VarGroupSelection,
} from '../../common/services/cloud_connectors';
import type { CloudProvider } from '../types';
import type { UpdatePolicy } from '../components/cloud_connector/types';

export type { VarGroupSelection };

export interface CloudConnectorInfo {
  /** Whether a cloud connector option is currently selected */
  isSelected: boolean;
  /** The cloud provider (e.g., 'aws', 'azure') if cloud connector is selected */
  cloudProvider?: CloudProvider;
  /** IaC template URL from the selected var_group option */
  iacTemplateUrl?: string;
  /** Set of variable names handled by cloud connector (should be hidden from regular var fields) */
  cloudConnectorVars: Set<string>;
  /** Callback compatible with CloudConnectorSetup component */
  handleCloudConnectorUpdate: UpdatePolicy;
}

export interface UseVarGroupCloudConnectorProps {
  /** The var_groups from package info */
  varGroups: RegistryVarGroup[] | undefined;
  /** Current var_group selections */
  varGroupSelections: VarGroupSelection;
  /** Callback to update the package policy */
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
}

/**
 * Hook to manage cloud connector state derived from var_group selections.
 *
 * When a var_group option with a `provider` field is selected, this indicates
 * that the CloudConnectorSetup component should be shown instead of individual
 * var input fields.
 *
 * This hook provides:
 * - Whether a cloud connector option is selected
 * - The cloud provider type (aws, azure, etc.)
 * - The IaC template URL if available
 * - The set of vars handled by cloud connector (to hide from regular form)
 * - A callback compatible with CloudConnectorSetup
 */
export const useVarGroupCloudConnector = ({
  varGroups,
  varGroupSelections,
  updatePackagePolicy,
}: UseVarGroupCloudConnectorProps): CloudConnectorInfo => {
  // Check if a cloud connector option is selected
  const cloudConnectorOption = useMemo(
    () => getCloudConnectorOption(varGroups, varGroupSelections),
    [varGroups, varGroupSelections]
  );

  // Get IaC template URL from var_group selection
  const iacTemplateUrl = useMemo(
    () => getIacTemplateUrlFromVarGroupSelection(varGroups, varGroupSelections),
    [varGroups, varGroupSelections]
  );

  // Get vars that belong to the selected cloud connector option
  const cloudConnectorVars = useMemo(
    () => getCloudConnectorVars(varGroups, varGroupSelections),
    [varGroups, varGroupSelections]
  );

  // Create an UpdatePolicy callback compatible with CloudConnectorSetup
  const handleCloudConnectorUpdate: UpdatePolicy = useCallback(
    ({ updatedPolicy }) => {
      updatePackagePolicy(updatedPolicy);
    },
    [updatePackagePolicy]
  );

  return {
    isSelected: cloudConnectorOption.isSelected,
    cloudProvider: cloudConnectorOption.provider,
    iacTemplateUrl,
    cloudConnectorVars,
    handleCloudConnectorUpdate,
  };
};
