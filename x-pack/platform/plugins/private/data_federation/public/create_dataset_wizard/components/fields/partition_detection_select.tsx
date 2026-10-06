/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import type { DatasetPartitionDetectionFormValue } from '../../create_dataset_form_state';
import type { ComboBoxChange } from '../combo_box_selection_validity';
import {
  EuiComboBoxNoCustomOption,
  type EuiComboBoxNoCustomOptionOption,
} from '../eui_combo_box_no_custom_option';

const PARTITION_DETECTION_OPTIONS: Array<
  EuiComboBoxNoCustomOptionOption<Exclude<DatasetPartitionDetectionFormValue, ''>>
> = [
  {
    value: 'auto',
    label: createDatasetWizardStrings.settingsPartitionDetectionAuto,
    description: createDatasetWizardStrings.settingsPartitionDetectionAutoDescription,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-auto',
  },
  {
    value: 'hive',
    label: createDatasetWizardStrings.settingsPartitionDetectionHive,
    description: createDatasetWizardStrings.settingsPartitionDetectionHiveDescription,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-hive',
  },
  {
    value: 'template',
    label: createDatasetWizardStrings.settingsPartitionDetectionTemplate,
    description: createDatasetWizardStrings.settingsPartitionDetectionTemplateDescription,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-template',
  },
  {
    value: 'none',
    label: createDatasetWizardStrings.settingsPartitionDetectionNone,
    description: createDatasetWizardStrings.settingsPartitionDetectionNoneDescription,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-none',
  },
];

export const getPartitionDetectionDisplayLabel = (value: string): string =>
  PARTITION_DETECTION_OPTIONS.find((option) => option.value === value)?.label ?? value;

export function PartitionDetectionSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetPartitionDetectionFormValue;
  onChange: (next: ComboBoxChange<DatasetPartitionDetectionFormValue>) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  return (
    <EuiComboBoxNoCustomOption
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      options={PARTITION_DETECTION_OPTIONS}
      defaultValue="auto"
      isInvalid={isInvalid}
      placeholder={createDatasetWizardStrings.settingsPartitionDetectionPlaceholder}
      aria-label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
      data-test-subj="createDatasetSettingsPartitionDetection"
    />
  );
}
