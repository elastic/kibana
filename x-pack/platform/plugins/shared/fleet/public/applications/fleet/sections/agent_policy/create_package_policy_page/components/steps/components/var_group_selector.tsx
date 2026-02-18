/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiFormRow, EuiSelect, EuiText, EuiSpacer, EuiTitle } from '@elastic/eui';

import type { RegistryVarGroup } from '../../../../../../types';

import { getVisibleOptions } from '../../../services/var_group_helpers';

interface VarGroupSelectorProps {
  varGroup: RegistryVarGroup;
  selectedOptionName: string | undefined;
  onSelectionChange: (groupName: string, optionName: string) => void;
  isAgentlessEnabled: boolean;
  hideInVarGroupOptions?: Record<string, string[]>;
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
