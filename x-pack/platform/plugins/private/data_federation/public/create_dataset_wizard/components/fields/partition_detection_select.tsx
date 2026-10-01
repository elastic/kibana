/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import type { DatasetPartitionDetectionFormValue } from '../../create_dataset_form_state';
import { DescribedOptionDisplay } from '../described_option_display';

type Option = EuiComboBoxOptionOption<string> & {
  value: DatasetPartitionDetectionFormValue;
  description: string;
  'data-test-subj': string;
};

export interface PartitionDetectionChange {
  value: DatasetPartitionDetectionFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

const renderPartitionDetectionOption = (option: EuiComboBoxOptionOption<string>) => {
  const opt = option as Option;
  return <DescribedOptionDisplay title={opt.label} description={opt.description} />;
};

const PARTITION_DETECTION_OPTIONS: Option[] = [
  {
    value: 'auto',
    label: createDatasetWizardStrings.settingsPartitionDetectionAuto,
    description: createDatasetWizardStrings.settingsPartitionDetectionAutoDescription,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
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

export function PartitionDetectionSelect({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetPartitionDetectionFormValue;
  onChange: (next: PartitionDetectionChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const selectedOption = PARTITION_DETECTION_OPTIONS.find((o) => o.value === value);

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsPartitionDetectionPlaceholder}
      options={PARTITION_DETECTION_OPTIONS}
      data-test-subj="createDatasetSettingsPartitionDetection"
      aria-label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      rowHeight="auto"
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
      renderOption={renderPartitionDetectionOption}
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as Option | undefined;
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
      fullWidth
    />
  );
}
