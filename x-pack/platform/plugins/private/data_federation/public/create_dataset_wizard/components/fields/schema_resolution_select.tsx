/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  DEFAULT_SCHEMA_RESOLUTION,
  type DatasetSchemaResolutionFormValue,
} from '../../create_dataset_form_state';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import type { ComboBoxChange } from '../combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from '../eui_combo_box_no_custom_option';

const SCHEMA_RESOLUTION_OPTIONS: Array<
  EuiComboBoxNoCustomOptionOption<Exclude<DatasetSchemaResolutionFormValue, ''>>
> = [
  {
    value: DEFAULT_SCHEMA_RESOLUTION,
    label: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWins,
    description: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWinsDescription,
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

export const getSchemaResolutionDisplayLabel = (value: string): string =>
  SCHEMA_RESOLUTION_OPTIONS.find((option) => option.value === value)?.label ?? value;

/** An empty value means unset, so the request uses the API default. */
export function SchemaResolutionSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
  isDisabled,
}: {
  value: DatasetSchemaResolutionFormValue;
  onChange: (next: ComboBoxChange<DatasetSchemaResolutionFormValue>) => void;
  onBlur: () => void;
  isInvalid: boolean;
  isDisabled?: boolean;
}) {
  return (
    <EuiComboBoxNoCustomOption
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={SCHEMA_RESOLUTION_OPTIONS}
      defaultValue={DEFAULT_SCHEMA_RESOLUTION}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      compressed
      placeholder={createDatasetWizardStrings.settingsSchemaResolutionPlaceholder}
      aria-label={createDatasetWizardStrings.settingsSchemaResolutionLabel}
      data-test-subj="createDatasetWizardSchemaResolution"
    />
  );
}
