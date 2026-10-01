/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiBadge, EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';

type TrimSpacesOption = EuiComboBoxOptionOption<string> & { value: DatasetBooleanFormValue };

export interface TrimSpacesChange {
  value: DatasetBooleanFormValue;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

const OPTIONS: TrimSpacesOption[] = [
  {
    value: 'false',
    label: createDatasetWizardStrings.falseLabel,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
  },
  { value: 'true', label: createDatasetWizardStrings.trueLabel },
];

export function TrimSpaces({
  value,
  onChange,
  onBlur,
  isInvalid,
}: {
  value: DatasetBooleanFormValue;
  onChange: (next: TrimSpacesChange) => void;
  onBlur: () => void;
  isInvalid: boolean;
}) {
  // EuiComboBox clears its search text right after reporting a selection, before the new `value` prop
  // arrives; the search handler reads this ref so that report cannot revert the selection.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const selectedOptions = useMemo(() => {
    const option = OPTIONS.find((o) => o.value === value);
    return option ? [{ value: option.value, label: option.label }] : [];
  }, [value]);

  return (
    <EuiComboBox
      placeholder={createDatasetWizardStrings.settingsTrimSpacesPlaceholder}
      options={OPTIONS}
      data-test-subj="createDatasetSettingsTrimSpaces"
      fullWidth
      aria-label={createDatasetWizardStrings.settingsTrimSpacesLabel}
      singleSelection={{ asPlainText: true }}
      isClearable
      selectedOptions={selectedOptions}
      isInvalid={isInvalid}
      onSearchChange={(searchValue) => {
        onChange({ value: latestValue.current, isValid: !searchValue });
      }}
      onChange={(nextSelectedOptions) => {
        const next = nextSelectedOptions?.[0] as TrimSpacesOption | undefined;
        latestValue.current = next?.value ?? '';
        onChange({ value: latestValue.current, isValid: true });
      }}
      onBlur={onBlur}
    />
  );
}
