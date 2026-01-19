/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiFormRow, EuiSelect, EuiText, EuiSpacer, EuiTitle } from '@elastic/eui';

import type { RegistryVarGroup, RegistryVarGroupOption } from '../../../../../../types';

export interface VarGroupSelection {
  [groupName: string]: string; // groupName -> selected option name
}

interface VarGroupSelectorProps {
  varGroup: RegistryVarGroup;
  selectedOptionName: string | undefined;
  onSelectionChange: (groupName: string, optionName: string) => void;
  isAgentlessEnabled: boolean;
  hideInVarGroupOptions?: Record<string, string[]>;
}

/**
 * Get visible options for a var group, filtering out options that should be hidden
 * based on deployment mode or hide_in_var_group_options configuration.
 */
export function getVisibleOptions(
  varGroup: RegistryVarGroup,
  isAgentlessEnabled: boolean,
  hideInVarGroupOptions?: Record<string, string[]>
): RegistryVarGroupOption[] {
  const hiddenOptionNames = hideInVarGroupOptions?.[varGroup.name] ?? [];

  return varGroup.options.filter((option) => {
    // Check if option is hidden via hide_in_var_group_options
    if (hiddenOptionNames.includes(option.name)) {
      return false;
    }

    // Check if option is hidden based on deployment mode
    if (option.hide_in_deployment_modes) {
      if (isAgentlessEnabled && option.hide_in_deployment_modes.includes('agentless')) {
        return false;
      }
      if (!isAgentlessEnabled && option.hide_in_deployment_modes.includes('default')) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get variable names that should be visible based on the selected option.
 * Returns undefined if no option is selected.
 */
export function getVisibleVarsForOption(
  varGroup: RegistryVarGroup,
  selectedOptionName: string | undefined
): string[] | undefined {
  if (!selectedOptionName) {
    return undefined;
  }

  const selectedOption = varGroup.options.find((opt) => opt.name === selectedOptionName);
  return selectedOption?.vars;
}

/**
 * Get all variable names that are controlled by any var_group.
 * These vars should only be shown when their option is selected.
 */
export function getVarsControlledByVarGroups(varGroups: RegistryVarGroup[]): Set<string> {
  return new Set(varGroups.flatMap((group) => group.options.flatMap((option) => option.vars)));
}

/**
 * Compute default selections from var_groups (first visible option for each group).
 */
export function computeDefaultVarGroupSelections(
  varGroups: RegistryVarGroup[] | undefined,
  isAgentlessEnabled: boolean,
  hideInVarGroupOptions?: Record<string, string[]>
): VarGroupSelection {
  const defaults: VarGroupSelection = {};
  if (varGroups) {
    for (const varGroup of varGroups) {
      const visibleOptions = getVisibleOptions(varGroup, isAgentlessEnabled, hideInVarGroupOptions);
      if (visibleOptions.length > 0) {
        defaults[varGroup.name] = visibleOptions[0].name;
      }
    }
  }
  return defaults;
}

/**
 * Determines if a variable should be visible based on var_group selections.
 */
export function shouldShowVar(
  varName: string,
  varGroups: RegistryVarGroup[],
  varGroupSelections: VarGroupSelection
): boolean {
  // Get all vars controlled by var_groups
  const controlledVars = getVarsControlledByVarGroups(varGroups);

  // If this var is not controlled by any var_group, always show it
  if (!controlledVars.has(varName)) {
    return true;
  }

  // Check if this var is in the selected option for any var_group
  return varGroups
    .filter((group) => varGroupSelections[group.name])
    .some((group) => {
      const selectedOption = group.options.find(
        (opt) => opt.name === varGroupSelections[group.name]
      );
      return selectedOption?.vars.includes(varName);
    });
}

/**
 * Determines if a variable is required due to being in a required var_group's selected option.
 * When var_group.required is true, all vars in the selected option are treated as required.
 */
export function isVarRequiredByVarGroup(
  varName: string,
  varGroups: RegistryVarGroup[] | undefined,
  varGroupSelections: VarGroupSelection | undefined
): boolean {
  if (!varGroups || varGroups.length === 0 || !varGroupSelections) {
    return false;
  }

  return varGroups
    .filter((group) => group.required && varGroupSelections[group.name])
    .some((group) => {
      const selectedOption = group.options.find(
        (opt) => opt.name === varGroupSelections[group.name]
      );
      return selectedOption?.vars.includes(varName);
    });
}

/**
 * VarGroupSelector component renders a dropdown for selecting between
 * mutually exclusive variable groups (e.g., authentication methods).
 */
export const VarGroupSelector: React.FC<VarGroupSelectorProps> = ({
  varGroup,
  selectedOptionName,
  onSelectionChange,
  isAgentlessEnabled,
  hideInVarGroupOptions,
}) => {
  const visibleOptions = useMemo(
    () => getVisibleOptions(varGroup, isAgentlessEnabled, hideInVarGroupOptions),
    [varGroup, isAgentlessEnabled, hideInVarGroupOptions]
  );

  // Auto-select first visible option if current selection is not visible
  useEffect(() => {
    if (visibleOptions.length === 0) return;

    const isCurrentSelectionVisible = visibleOptions.some((opt) => opt.name === selectedOptionName);

    if (!isCurrentSelectionVisible) {
      // Reset to first visible option
      onSelectionChange(varGroup.name, visibleOptions[0].name);
    }
  }, [visibleOptions, selectedOptionName, onSelectionChange, varGroup.name]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSelectionChange(varGroup.name, e.target.value);
    },
    [onSelectionChange, varGroup.name]
  );

  const selectOptions = useMemo(
    () =>
      visibleOptions.map((option) => ({
        value: option.name,
        text: option.title,
      })),
    [visibleOptions]
  );

  // Find the selected option to show its description
  const selectedOption = useMemo(
    () => visibleOptions.find((opt) => opt.name === selectedOptionName),
    [visibleOptions, selectedOptionName]
  );

  // Don't render if no visible options
  if (visibleOptions.length === 0) {
    return null;
  }

  // Don't render selector if only one option (but still use its vars)
  if (visibleOptions.length === 1) {
    return null;
  }

  // eslint-disable-next-line no-console
  console.log(
    'varGroup.description:',
    varGroup.description,
    'selectedOptionName:',
    selectedOptionName
  );

  return (
    <>
      {/* Section title */}
      <EuiTitle size="s">
        <h4>{varGroup.title}</h4>
      </EuiTitle>

      {/* Group description */}
      {varGroup.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {varGroup.description}
          </EuiText>
        </>
      )}

      <EuiSpacer size="m" />

      {/* Selector dropdown */}
      <EuiFormRow label={varGroup.selector_title} helpText={selectedOption?.description} fullWidth>
        <EuiSelect
          data-test-subj={`varGroupSelector-${varGroup.name}`}
          options={selectOptions}
          value={selectedOptionName || ''}
          onChange={handleChange}
          fullWidth
        />
      </EuiFormRow>

      <EuiSpacer size="m" />
    </>
  );
};
