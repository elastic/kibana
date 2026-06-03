/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { FormFieldProps } from '../../form/types';
import type { PlatformId } from './platforms';
import { OS_OPTIONS, isPlatformId } from './platforms';

type Props = Omit<FormFieldProps<string>, 'name' | 'label'>;

const REQUIRED_ERROR_MESSAGE = i18n.translate(
  'xpack.osquery.pack.queryFlyoutForm.osRequiredError',
  {
    defaultMessage: 'Select at least one operating system.',
  }
);

export const PlatformCheckBoxGroupField = (props: Props) => {
  const { euiFieldProps = {}, idAria, helpText, ...rest } = props;
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps;
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController<{ platform: string }>({
    name: 'platform',
    defaultValue: '',
    rules: {
      validate: (fieldValue) =>
        typeof fieldValue === 'string' && fieldValue.trim().length > 0
          ? true
          : REQUIRED_ERROR_MESSAGE,
    },
  });

  const selectedOptions = useMemo(() => {
    if (typeof value !== 'string' || value.length === 0) {
      return [];
    }

    const ids = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return OS_OPTIONS.filter((opt) => ids.includes(opt.key));
  }, [value]);

  const handleChange = useCallback(
    (newOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const ids = newOptions
        .map((opt) => opt.key)
        .filter((key): key is PlatformId => key !== undefined && isPlatformId(key));
      onChange(ids.join(','));
    },
    [onChange]
  );

  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.osFieldLabel', {
        defaultMessage: 'Operating systems',
      })}
      helpText={typeof helpText === 'function' ? helpText() : helpText}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
      describedByIds={describedByIds}
      {...rest}
    >
      <EuiComboBox
        data-test-subj="osquery-platform-checkbox-group"
        options={OS_OPTIONS}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        isDisabled={!!isDisabled}
        isInvalid={hasError}
        fullWidth
        isClearable={false}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};
