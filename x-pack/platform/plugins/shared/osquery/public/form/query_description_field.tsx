/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface QueryDescriptionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const QueryDescriptionFieldComponent = ({ euiFieldProps }: QueryDescriptionFieldProps) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'description',
    defaultValue: '',
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps ?? {};

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.form.descriptionFieldLabel', {
        defaultMessage: 'Description (optional)',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiFieldText
        isInvalid={hasError}
        onChange={onChange}
        value={value}
        name={fieldName}
        fullWidth
        data-test-subj="input"
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const QueryDescriptionField = React.memo(QueryDescriptionFieldComponent);
