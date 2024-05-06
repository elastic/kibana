/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useState } from 'react';

interface Props {
  initialBurnRate?: number;
  maxBurnRate: number;
  errors?: string[];
  onChange: (burnRate: number) => void;
}

export function BurnRate({ onChange, initialBurnRate = 1, maxBurnRate, errors }: Props) {
  const [burnRate, setBurnRate] = useState<number>(initialBurnRate);
  const hasError = errors !== undefined && errors.length > 0;
  const [formattedValue, setFormattedValue] = useState<string>(burnRate.toFixed(2));

  const onBurnRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setBurnRate(value);
    onChange(value);
  };

  return (
    <EuiFormRow
      label={
        <>
          {i18n.translate('xpack.slo.rules.burnRate.rowLabel', {
            defaultMessage: 'Burn rate threshold',
          })}{' '}
          <EuiIconTip
            position="top"
            content={i18n.translate('xpack.slo.rules.burnRate.tooltip', {
              defaultMessage:
                'The burn rate is how fast the service consumes the error budget over the lookback period.',
            })}
          />
        </>
      }
      fullWidth
      isInvalid={hasError}
    >
      <EuiFieldNumber
        fullWidth
        step={0.01}
        min={0.01}
        max={maxBurnRate}
        value={formattedValue}
        onChange={(event) => {
          onBurnRateChange(event);
          setFormattedValue(event.target.value);
        }}
        onBlur={(event) => {
          const value = event.target.value;
          setFormattedValue(Number(value).toFixed(2));
        }}
        data-test-subj="burnRate"
      />
    </EuiFormRow>
  );
}
