/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { LICENCE_FOR_OUTPUT_PER_INTEGRATION } from '../../../../../../../../../common/constants';
import type {
  AgentPolicy,
  NewPackagePolicy,
  PackagePolicyConfigRecord,
} from '../../../../../../../../../common/types';
import type { RegistryVarGroup } from '../../../../../../types';
import { getAllowedOutputTypesForPackagePolicy } from '../../../../../../../../../common/services/output_helpers';
import {
  inferVarGroupSelections,
  sanitizeVarGroupSelections,
} from '../../../../../../../../../common/services';
import { useGetOutputs, useLicense } from '../../../../../../hooks';

import {
  computeDefaultVarGroupSelections,
  type VarGroupSelection,
} from '../../../services/var_group_helpers';
import {
  buildVarGroupPolicyUpdates,
  buildStreamVarGroupVarsUpdate,
} from '../../../services/var_group_policy_effects';

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
  /**
   * Optional: current stream vars, for stream-level var_groups only. When
   * provided, a selection change also clears the plain-text vars of the
   * deselected options, so stale values don't stay in the policy and leak
   * into the agent template. Package-level (and input-level) call sites do
   * not pass this, so their behaviour is unchanged.
   */
  streamVars?: PackagePolicyConfigRecord;
  /**
   * Optional: options to hide per var group (e.g. options unsupported by the
   * policy template the form is scoped to). Hidden options are excluded when
   * computing default selections.
   */
  hideInVarGroupOptions?: Record<string, string[]>;
  /** Vars to infer selections from when the groups' vars aren't the package policy's own (stream/input-level groups). Defaults to `packagePolicy?.vars`. */
  varsForInference?: PackagePolicyConfigRecord;
  /**
   * Optional: whether the form is editing an existing policy. When true, a policy with no
   * stored selections (it predates the package's var_groups) is inferred from its populated
   * vars instead of falling back to the first visible option.
   */
  isEditPage?: boolean;
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
  streamVars,
  hideInVarGroupOptions,
  varsForInference,
  isEditPage = false,
}: UseVarGroupSelectionsParams) {
  // Derive selections when none are saved: defaults for new policies; on the edit page,
  // inference from the policy's populated vars (a policy predating var_groups has no stored
  // selections). Inference never picks an option hidden in the current deployment mode.
  const deriveSelections = useCallback((): VarGroupSelection => {
    const defaults = computeDefaultVarGroupSelections(
      varGroups,
      isAgentlessEnabled,
      hideInVarGroupOptions
    );
    if (!isEditPage) {
      return defaults;
    }
    const inferred = inferVarGroupSelections(
      varGroups,
      varsForInference ?? packagePolicy?.vars,
      isAgentlessEnabled ? 'agentless' : 'default'
    );
    return inferred ? { ...defaults, ...inferred } : defaults;
  }, [
    varGroups,
    isAgentlessEnabled,
    hideInVarGroupOptions,
    isEditPage,
    varsForInference,
    packagePolicy?.vars,
  ]);

  // Drop selections naming options the package no longer declares, so derive/inference runs for them (matches validation; otherwise all group-controlled fields are hidden).
  const sanitizedSavedSelections = useMemo(
    () => sanitizeVarGroupSelections(varGroups, savedSelections),
    [varGroups, savedSelections]
  );

  // Current selections: valid saved selections win; the rest get the derived value,
  // the same value validation derives, so the form and validation agree.
  const selections = useMemo((): VarGroupSelection => {
    const derived = deriveSelections();
    return sanitizedSavedSelections ? { ...derived, ...sanitizedSavedSelections } : derived;
  }, [sanitizedSavedSelections, deriveSelections]);

  // Initialize on mount if not already set. The default selection applies the same
  // policy effects as a user selection, so its vars are required from the start.
  useEffect(() => {
    if (varGroups && varGroups.length > 0 && !savedSelections) {
      const derived = deriveSelections();
      if (Object.keys(derived).length > 0) {
        const policyEffects = packagePolicy
          ? buildVarGroupPolicyUpdates(packagePolicy, derived, varGroups)
          : null;
        onSelectionsChange({ var_group_selections: derived, ...(policyEffects || {}) });
      }
    }
  }, [varGroups, savedSelections, onSelectionsChange, deriveSelections, packagePolicy]);

  // Handle selection change with policy effects computation. The new selections build
  // on `selections` — what the form actually shows — so a group displayed only through
  // derivation is not dropped from the persisted update.
  const handleSelectionChange = useCallback(
    (groupName: string, optionName: string) => {
      const newSelections: VarGroupSelection = {
        ...selections,
        [groupName]: optionName,
      };

      // Compute policy effects (e.g., supports_cloud_connector) if packagePolicy is provided
      const policyEffects =
        packagePolicy && varGroups
          ? buildVarGroupPolicyUpdates(packagePolicy, newSelections, varGroups)
          : null;

      // Stream-level var_groups only: clear the deselected options' plain-text vars
      // so stale values don't leak into the agent template.
      let clearedStreamVars: PackagePolicyConfigRecord | undefined;
      if (streamVars && varGroups) {
        const varGroup = varGroups.find((group) => group.name === groupName);
        if (varGroup) {
          clearedStreamVars = buildStreamVarGroupVarsUpdate(
            streamVars,
            varGroup,
            selections[groupName],
            optionName
          );
        }
      }

      // Apply selections and any policy effects together
      onSelectionsChange({
        var_group_selections: newSelections,
        ...(policyEffects || {}),
        ...(clearedStreamVars ? { vars: clearedStreamVars } : {}),
      });
    },
    [selections, onSelectionsChange, packagePolicy, varGroups, streamVars]
  );

  // Persist the normalized selections when what the form shows differs from what is
  // stored: a stale saved selection was dropped, or derivation filled in a group the
  // stored map does not cover (an empty or partial map). The same policy effects apply
  // here as to a user selection. This lives after handleSelectionChange because the
  // mount effect above is also touched by upstream; keeping this write in its own block
  // avoids an adjacent-change merge conflict. (Reference equality cannot detect the
  // missing-group case — sanitize returns the input unchanged when nothing was dropped —
  // so compare the merged selections against the sanitized stored map instead.)
  useEffect(() => {
    if (!varGroups || varGroups.length === 0) return;
    if (!savedSelections) return;
    const needsPersist = Object.entries(selections).some(
      ([groupName, optionName]) => sanitizedSavedSelections?.[groupName] !== optionName
    );
    if (!needsPersist) return;
    if (Object.keys(selections).length === 0) return;
    const policyEffects =
      packagePolicy && varGroups
        ? buildVarGroupPolicyUpdates(packagePolicy, selections, varGroups)
        : null;
    onSelectionsChange({
      var_group_selections: selections,
      ...(policyEffects || {}),
    });
  }, [
    varGroups,
    savedSelections,
    sanitizedSavedSelections,
    selections,
    onSelectionsChange,
    packagePolicy,
  ]);

  return { selections, handleSelectionChange };
}
