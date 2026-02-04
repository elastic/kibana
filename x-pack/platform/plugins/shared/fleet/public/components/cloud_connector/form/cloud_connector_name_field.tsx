/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getCloudConnectorNameError } from '../utils';

interface CloudConnectorNameFieldProps {
  value: string;
  onChange: (name: string, isValid: boolean, validationError?: string) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

export const CloudConnectorNameField: React.FC<CloudConnectorNameFieldProps> = ({
  value,
  onChange,
  disabled = false,
  'data-test-subj': dataTestSubj,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const formatError = getCloudConnectorNameError(newValue);

    onChange(newValue, !formatError, formatError);
  };

  const error = getCloudConnectorNameError(value);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.fleet.cloudConnector.nameField.label', {
        defaultMessage: 'Cloud Connector Name',
      })}
      isInvalid={!!error}
      error={error}
      fullWidth
    >
      <EuiFieldText
        value={value}
        onChange={handleChange}
        isInvalid={!!error}
        disabled={disabled}
        fullWidth
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
