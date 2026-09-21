/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { CreateDatasetFormValues, DatasetBooleanFormValue } from '../create_dataset_form_state';

const LATE_MATERIALIZATION_OPTIONS = [
  {
    value: 'true',
    inputDisplay: <EuiText size="s">{createDatasetWizardStrings.enabledLabel}</EuiText>,
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiText size="s">{createDatasetWizardStrings.enabledLabel}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'createDatasetSettingsLateMaterializationOption-true',
  },
  {
    value: 'false',
    inputDisplay: <EuiText size="s">{createDatasetWizardStrings.disabledLabel}</EuiText>,
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiText size="s">{createDatasetWizardStrings.disabledLabel}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': 'createDatasetSettingsLateMaterializationOption-false',
  },
] satisfies Array<EuiSuperSelectOption<DatasetBooleanFormValue>>;

export function LateMaterializationSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: lateMaterializationField } = useController({
    name: 'settings.late_materialization',
    control,
  });

  return (
    <EuiSuperSelect
      options={LATE_MATERIALIZATION_OPTIONS}
      data-test-subj="createDatasetSettingsLateMaterialization"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsLateMaterializationLabel}
      valueOfSelected={lateMaterializationField.value || undefined}
      onChange={(value) => lateMaterializationField.onChange(value)}
      onBlur={lateMaterializationField.onBlur}
      placeholder={createDatasetWizardStrings.settingsLateMaterializationPlaceholder}
    />
  );
}

