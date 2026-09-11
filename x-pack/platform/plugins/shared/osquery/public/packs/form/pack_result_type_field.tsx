/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import type { ResultType } from '../../../common/result_type';

const PACK_RESULT_TYPE_OPTIONS = [
  {
    value: 'snapshot' as const,
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.form.packResultTypeField.snapshotLabel"
        defaultMessage="Snapshot"
      />
    ),
  },
  {
    value: 'differential' as const,
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.form.packResultTypeField.differentialLabel"
        defaultMessage="Differential"
      />
    ),
  },
  {
    value: 'differential_added_only' as const,
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.form.packResultTypeField.differentialAddedOnlyLabel"
        defaultMessage="Differential (Ignore removals)"
      />
    ),
  },
];

const EMPTY_VALUE = '' as const;

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
      onChange(newValue === EMPTY_VALUE ? undefined : newValue);
    },
    [onChange]
  );

  const options = useMemo(
    () => [
      {
        value: EMPTY_VALUE,
        inputDisplay: (
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.osquery.pack.form.packResultTypeField.noDefaultLabel"
              defaultMessage="No pack default"
            />
          </EuiText>
        ),
      },
      ...PACK_RESULT_TYPE_OPTIONS,
    ],
    []
  );

  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.osquery.pack.form.packResultTypeFieldLabel"
          defaultMessage="Result type"
        />
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.pack.form.packResultTypeFieldOptionalLabel"
            defaultMessage="optional"
          />
        </EuiText>
      }
      fullWidth
    >
      <EuiSuperSelect
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
