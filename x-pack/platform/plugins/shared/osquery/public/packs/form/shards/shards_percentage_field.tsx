/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRange } from '@elastic/eui';
import type { EuiRangeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ShardsFormReturn } from './shards_form';

interface ShardsPercentageFieldComponent {
  index: number;
  control: ShardsFormReturn['control'];
  euiFieldProps?: Record<string, unknown>;
  hideLabel?: boolean;
}

const ShardsPercentageFieldComponent = ({
  index,
  control,
  euiFieldProps,
  hideLabel,
}: ShardsPercentageFieldComponent) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    control,
    name: `shardsArray.${index}.percentage`,
    defaultValue: 100,
  });

  const handleChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (e) => {
      const numberValue = (e.target as { valueAsNumber: number }).valueAsNumber
        ? (e.target as { valueAsNumber: number }).valueAsNumber
        : 0;
      onChange(numberValue);
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={
        hideLabel
          ? ''
          : i18n.translate('xpack.osquery.pack.form.percentageFieldLabel', {
              defaultMessage: 'Shard',
            })
      }
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={10}>
          <EuiRange
            data-test-subj="shards-field-percentage"
            id={'shardsPercentage' + index}
            min={0}
            max={100}
            step={1}
            value={value}
            fullWidth={true}
            showInput={true}
            showLabels={false}
            append={'%'}
            onChange={handleChange}
            {...euiFieldProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const ShardsPercentageField = React.memo(ShardsPercentageFieldComponent);
