/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';

export interface ConnectorSelectorOption {
  value: string;
  label: string;
}

interface Props {
  selectedConnectorIds: string[];
  connectorOptions: ConnectorSelectorOption[];
  onChange: (connectorIds: string[]) => void;
  dataTestSubj: string;
  label?: string;
  ariaLabelledBy?: string;
  helpText?: string;
  isLoading?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
  error?: string;
  fullWidth?: boolean;
  singleSelection?: boolean;
  isClearable?: boolean;
}

export const ConnectorSelector = ({
  selectedConnectorIds,
  connectorOptions,
  onChange,
  dataTestSubj,
  label,
  ariaLabelledBy,
  helpText,
  isLoading = false,
  isInvalid = false,
  isDisabled = false,
  error,
  fullWidth = true,
  singleSelection = false,
  isClearable = true,
}: Props) => {
  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => connectorOptions.map((option) => ({ value: option.value, label: option.label })),
    [connectorOptions]
  );

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => options.filter((option) => selectedConnectorIds.includes(option.value as string)),
    [options, selectedConnectorIds]
  );

  return (
    <EuiFormRow
      label={label}
      aria-labelledby={ariaLabelledBy}
      helpText={helpText}
      isInvalid={isInvalid}
      error={error}
      fullWidth={fullWidth}
    >
      <EuiComboBox<string>
        fullWidth={fullWidth}
        isLoading={isLoading}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        options={options}
        selectedOptions={selectedOptions}
        onChange={(selected) => {
          const selectedIds = selected
            .map((option) => option.value as string)
            .filter((value) => value.length > 0);
          onChange(singleSelection ? selectedIds.slice(0, 1) : selectedIds);
        }}
        singleSelection={singleSelection ? { asPlainText: true } : undefined}
        isClearable={isClearable}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
