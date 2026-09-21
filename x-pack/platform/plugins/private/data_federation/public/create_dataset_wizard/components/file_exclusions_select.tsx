/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { CreateDatasetFormValues } from '../create_dataset_form_state';

export function FileExclusionsSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: fileExclusionsField } = useController({
    name: 'settings.file_exclusions',
    control,
  });

  return (
    <EuiComboBox
      noSuggestions
      delimiter=","
      placeholder={createDatasetWizardStrings.settingsFileExclusionsPlaceholder}
      selectedOptions={fileExclusionsField.value.map((label) => ({ label }))}
      onCreateOption={(searchValue) => {
        const trimmed = searchValue.trim();
        if (!trimmed || fileExclusionsField.value.includes(trimmed)) {
          return false;
        }
        fileExclusionsField.onChange([...fileExclusionsField.value, trimmed]);
      }}
      onChange={(options) => {
        fileExclusionsField.onChange(options.map((option) => option.label));
      }}
      onBlur={fileExclusionsField.onBlur}
      data-test-subj="createDatasetSettingsFileExclusions"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsFileExclusionsLabel}
    />
  );
}
