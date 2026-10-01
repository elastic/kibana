/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import type { DatasetSchemaResolutionFormValue } from '../../create_dataset_form_state';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import { DescribedOptionDisplay } from '../described_option_display';

export const DEFAULT_SCHEMA_RESOLUTION: Exclude<DatasetSchemaResolutionFormValue, ''> =
  'first_file_wins';

type SchemaResolutionOption = EuiComboBoxOptionOption<string> & {
  value: Exclude<DatasetSchemaResolutionFormValue, ''>;
  description: string;
  'data-test-subj': string;
};

export interface SchemaResolutionChange {
  value: DatasetSchemaResolutionFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

const renderSchemaResolutionOption = (option: EuiComboBoxOptionOption<string>) => {
  const opt = option as SchemaResolutionOption;
  return (
    <DescribedOptionDisplay
      title={opt.label}
      description={opt.description}
      testSubj={opt['data-test-subj']}
    />
  );
};

const SCHEMA_RESOLUTION_OPTIONS: SchemaResolutionOption[] = [
  {
    value: DEFAULT_SCHEMA_RESOLUTION,
    label: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWins,
    description: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWinsDescription,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-first_file_wins',
  },
  {
    value: 'strict',
    label: createDatasetWizardStrings.settingsSchemaResolutionStrict,
    description: createDatasetWizardStrings.settingsSchemaResolutionStrictDescription,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-strict',
  },
  {
    value: 'union_by_name',
    label: createDatasetWizardStrings.settingsSchemaResolutionUnionByName,
    description: createDatasetWizardStrings.settingsSchemaResolutionUnionByNameDescription,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-union_by_name',
  },
];

export function SchemaResolutionSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
  isDisabled,
}: {
  value: DatasetSchemaResolutionFormValue;
  onChange: (next: SchemaResolutionChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
  isDisabled?: boolean;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const selectedOption = SCHEMA_RESOLUTION_OPTIONS.find((o) => o.value === value);

  return (
    <EuiComboBox
      aria-label={createDatasetWizardStrings.settingsSchemaResolutionLabel}
      placeholder={createDatasetWizardStrings.settingsSchemaResolutionPlaceholder}
      singleSelection={{ asPlainText: true }}
      isClearable
      isDisabled={isDisabled}
      rowHeight="auto"
      fullWidth
      compressed
      options={SCHEMA_RESOLUTION_OPTIONS}
      renderOption={renderSchemaResolutionOption}
      selectedOptions={
        selectedOption ? [{ value: selectedOption.value, label: selectedOption.label }] : []
      }
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as SchemaResolutionOption | undefined;
        // Empty selection means "unset" so the request uses the API default.
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
      data-test-subj="createDatasetWizardSchemaResolution"
    />
  );
}
