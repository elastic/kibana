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
import deepEqual from 'fast-deep-equal';
import { createFormIdFieldValidations } from '../packs/queries/validations';

interface QueryIdFieldProps {
  idSet?: Set<string>;
  euiFieldProps?: Record<string, unknown>;
}

const QueryIdFieldComponent = ({ idSet, euiFieldProps }: QueryIdFieldProps) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'id',
    defaultValue: '',
    rules: idSet && createFormIdFieldValidations(idSet),
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps ?? {};

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.idFieldLabel', {
        defaultMessage: 'ID',
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

export const QueryIdField = React.memo(QueryIdFieldComponent, deepEqual);
