/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type {
  CreateDatasetFormValues,
  DatasetPartitionDetectionFormValue,
} from '../create_dataset_form_state';

type Option = EuiComboBoxOptionOption<string> & { value: DatasetPartitionDetectionFormValue };

const PARTITION_DETECTION_OPTIONS: Option[] = [
  {
    value: 'auto',
    label: createDatasetWizardStrings.settingsPartitionDetectionAuto,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-auto',
  },
  {
    value: 'hive',
    label: createDatasetWizardStrings.settingsPartitionDetectionHive,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-hive',
  },
  {
    value: 'none',
    label: createDatasetWizardStrings.settingsPartitionDetectionNone,
    'data-test-subj': 'createDatasetSettingsPartitionDetectionOption-none',
  },
];

export function PartitionDetectionSelect({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: partitionDetectionField } = useController({
    name: 'settings.partition_detection',
    control,
  });

  const selectedOption = PARTITION_DETECTION_OPTIONS.find(
    (o) => o.value === partitionDetectionField.value
  );

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsPartitionDetectionPlaceholder}
      options={PARTITION_DETECTION_OPTIONS}
      data-test-subj="createDatasetSettingsPartitionDetection"
      aria-label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      selectedOptions={
        selectedOption
          ? [
              {
                value: selectedOption.value,
                label: selectedOption.label,
              },
            ]
          : []
      }
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as Option | undefined;
        partitionDetectionField.onChange(next?.value ?? '');
      }}
      onBlur={partitionDetectionField.onBlur}
      fullWidth
    />
  );
}
