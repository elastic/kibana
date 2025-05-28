/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiFormRow,
  EuiTextColor,
  EuiRadioGroup,
  EuiLoadingSpinner,
} from '@elastic/eui';

import * as i18n from '../translations';

const RADIO_OPTIONS = [
  {
    id: DEFAULT_APP_CATEGORIES.observability.id,
    label: i18n.CREATE_FORM_SOLUTION_OBSERVABILITY_RULES,
    ['data-test-subj']: `option-${DEFAULT_APP_CATEGORIES.observability.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.security.id,
    label: i18n.CREATE_FORM_SOLUTION_SECURITY_RULES,
    ['data-test-subj']: `option-${DEFAULT_APP_CATEGORIES.security.id}`,
  },
  {
    id: DEFAULT_APP_CATEGORIES.management.id,
    label: i18n.CREATE_FORM_SOLUTION_STACK_RULES,
    ['data-test-subj']: `option-${DEFAULT_APP_CATEGORIES.management.id}`,
  },
].sort((a, b) => a.id.localeCompare(b.id));

export interface MaintenanceWindowSolutionSelectionProps {
  selectedSolution?: string;
  availableSolutions: string[];
  errors?: string[];
  isLoading?: boolean;
  isScopedQueryEnabled?: boolean;
  onChange: (solution: string) => void;
}

export const MaintenanceWindowSolutionSelection = (
  props: MaintenanceWindowSolutionSelectionProps
) => {
  const {
    selectedSolution,
    availableSolutions,
    errors = [],
    isLoading = false,
    isScopedQueryEnabled = false,
    onChange,
  } = props;

  const options = useMemo(() => {
    return RADIO_OPTIONS.map((option) => ({
      ...option,
      disabled: !availableSolutions.includes(option.id),
    })).sort((a, b) => a.id.localeCompare(b.id));
  }, [availableSolutions]);

  const onRadioChange = useCallback(
    (id: string) => {
      onChange(id);
    },
    [onChange]
  );

  const solutionSelection = useMemo(() => {
    return (
      <EuiRadioGroup
        data-test-subj="maintenanceWindowSolutionSelectionRadioGroup"
        options={options}
        idSelected={selectedSolution}
        onChange={onRadioChange}
      />
    );
  }, [options, selectedSolution, onRadioChange]);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="spaceAround"
        data-test-subj="maintenanceWindowSolutionSelectionLoading"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    isScopedQueryEnabled && (
      <EuiFlexGroup data-test-subj="maintenanceWindowSolutionSelection">
        <EuiFlexItem>
          <EuiText size="s">
            <h4>{i18n.CREATE_FORM_SOLUTION_SELECTION_TITLE}</h4>
            <p>
              <EuiTextColor color="subdued">
                {i18n.CREATE_FORM_SOLUTION_SELECTION_DESCRIPTION}
              </EuiTextColor>
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.CREATE_FORM_SOLUTION_SELECTION_CHECKBOX_GROUP_TITLE}
            isInvalid={!!errors.length}
            error={errors[0]}
          >
            {solutionSelection}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  );
};
