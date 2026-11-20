/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface DescriptionFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const DESCRIPTION_LABEL_APPEND = (
  <EuiText size="xs" color="subdued">
    <FormattedMessage id="xpack.osquery.queryFlyoutForm.optionalLabel" defaultMessage="optional" />
  </EuiText>
);

const DescriptionFieldComponent: React.FC<DescriptionFieldProps> = ({ euiFieldProps }) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'description',
    defaultValue: '',
  });

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  // See NameField: EuiFieldText takes `disabled`, so `isDisabled` goes on the row.
  const { isDisabled, ...fieldProps } = euiFieldProps ?? {};

  return (
    <EuiFormRow
      // Own id: `xpack.osquery.pack.form.descriptionFieldLabel` is shared with the
      // saved-query form, which still embeds "(optional)" in its label.
      label={i18n.translate('xpack.osquery.pack.form.packDescriptionFieldLabel', {
        defaultMessage: 'Description',
      })}
      labelAppend={DESCRIPTION_LABEL_APPEND}
      error={error?.message}
      isInvalid={hasError}
      isDisabled={Boolean(isDisabled)}
      fullWidth
    >
      <EuiFieldText
        isInvalid={hasError}
        onChange={onChange}
        value={value}
        name={fieldName}
        fullWidth
        data-test-subj="input"
        {...fieldProps}
      />
    </EuiFormRow>
  );
};

export const DescriptionField = React.memo(DescriptionFieldComponent);
