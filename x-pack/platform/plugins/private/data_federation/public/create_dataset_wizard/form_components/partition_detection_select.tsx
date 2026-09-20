/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type {
  CreateDatasetFormValues,
  DatasetPartitionDetectionFormValue,
} from '../create_dataset_form_state';

const PARTITION_DETECTION_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsPartitionDetectionPlaceholder },
  { value: 'auto', text: createDatasetWizardStrings.settingsPartitionDetectionAuto },
  { value: 'hive', text: createDatasetWizardStrings.settingsPartitionDetectionHive },
  { value: 'none', text: createDatasetWizardStrings.settingsPartitionDetectionNone },
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

  return (
    <EuiSelect
      options={PARTITION_DETECTION_OPTIONS}
      data-test-subj="createDatasetSettingsPartitionDetection"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
      value={partitionDetectionField.value}
      onChange={(e) =>
        partitionDetectionField.onChange(e.target.value as DatasetPartitionDetectionFormValue)
      }
      name={partitionDetectionField.name}
      inputRef={partitionDetectionField.ref}
    />
  );
}
