/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText, type EuiSuperSelectOption } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import type { ResultType } from '../../../common/result_type';
import { RESULT_TYPE_SELECT_OPTIONS } from '../../form/results_type_field';

const EMPTY_VALUE = '' as const;

type PackResultTypeOption = ResultType | typeof EMPTY_VALUE;

interface PackResultTypeFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const PackResultTypeFieldComponent: React.FC<PackResultTypeFieldProps> = ({
  euiFieldProps = {},
}) => {
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps;

  const {
    field: { onChange, value },
  } = useController<{ result_type?: ResultType | '' }>({
    name: 'result_type',
    defaultValue: EMPTY_VALUE,
  });

  const handleChange = useCallback(
    (newValue: ResultType | '') => {
      onChange(newValue);
    },
    [onChange]
  );

  const options = useMemo(
    (): Array<EuiSuperSelectOption<PackResultTypeOption>> => [
      {
        value: EMPTY_VALUE,
        inputDisplay: (
          <FormattedMessage
            id="xpack.osquery.pack.form.packResultTypeField.noDefaultLabel"
            defaultMessage="No pack default"
          />
        ),
        dropdownDisplay: (
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.osquery.pack.form.packResultTypeField.noDefaultLabel"
              defaultMessage="No pack default"
            />
          </EuiText>
        ),
      },
      ...(RESULT_TYPE_SELECT_OPTIONS as Array<EuiSuperSelectOption<PackResultTypeOption>>),
    ],
    []
  );

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.pack.queryFlyoutForm.resultTypeFieldLabel"
          defaultMessage="Result type"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.queryFlyoutForm.optionalLabel"
            defaultMessage="optional"
          />
        </EuiText>
      }
      fullWidth
    >
      <EuiSuperSelect<PackResultTypeOption>
        data-test-subj="pack-result-type-field"
        options={options}
        fullWidth
        valueOfSelected={value ?? EMPTY_VALUE}
        onChange={handleChange}
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const PackResultTypeField = React.memo(PackResultTypeFieldComponent, deepEqual);
