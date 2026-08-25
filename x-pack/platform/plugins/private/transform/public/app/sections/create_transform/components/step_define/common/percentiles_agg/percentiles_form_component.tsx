/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigPercentiles } from './types';

export const PercentilesAggForm: IPivotAggsConfigPercentiles['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
  errorMessages,
}) => {
  const selectedOptions = useMemo(
    () => aggConfig.percents?.map((p) => ({ label: p.toString() })) ?? [],
    [aggConfig.percents]
  );

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      if (!isValid) return false;

      const newValue = Number(inputValue.replace(',', '.'));

      const newOption = {
        label: newValue.toString(),
      };
      const updatedOptions = [...selectedOptions, newOption];

      onChange({
        percents: updatedOptions.map((option) => Number(option.label)),
      });
    },
    [isValid, onChange, selectedOptions]
  );

  const handleOptionsChange = useCallback(
    (newOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange({ percents: newOptions.map((option) => Number(option.label)) });
    },
    [onChange]
  );

  const handleSearchChange = useCallback(
    (searchValue: string) => {
      // If we're clearing the input after a valid creation,
      // this is the post-creation cleanup
      if (searchValue === '' && aggConfig.pendingPercentileInput && isValid) return;

      onChange({
        ...aggConfig,
        pendingPercentileInput: searchValue,
      });
    },
    [aggConfig, onChange, isValid]
  );

  // Get the last error message if there are any
  const lastErrorMessage = errorMessages?.length
    ? errorMessages[errorMessages.length - 1]
    : undefined;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
          defaultMessage: 'Percents',
        })}
        error={lastErrorMessage}
        isInvalid={!isValid}
      >
        <EuiComboBox
          noSuggestions
          selectedOptions={selectedOptions}
          onCreateOption={handleCreateOption}
          onChange={handleOptionsChange}
          onSearchChange={handleSearchChange}
          isInvalid={!isValid}
          data-test-subj="transformPercentilesAggPercentsSelector"
        />
      </EuiFormRow>
    </>
  );
};
