/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiRangeProps } from '@elastic/eui';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRange } from '@elastic/eui';
import { ML_ANOMALY_THRESHOLD, ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils';

export interface SeveritySelectorProps {
  value: number | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const MAX_ANOMALY_SCORE = 100;

export const SeverityControl: FC<SeveritySelectorProps> = React.memo(({ value, onChange }) => {
  const levels: EuiRangeProps['levels'] = [
    {
      min: ML_ANOMALY_THRESHOLD.LOW,
      max: ML_ANOMALY_THRESHOLD.MINOR,
      color: ML_SEVERITY_COLORS.WARNING,
    },
    {
      min: ML_ANOMALY_THRESHOLD.MINOR,
      max: ML_ANOMALY_THRESHOLD.MAJOR,
      color: ML_SEVERITY_COLORS.MINOR,
    },
    {
      min: ML_ANOMALY_THRESHOLD.MAJOR,
      max: ML_ANOMALY_THRESHOLD.CRITICAL,
      color: ML_SEVERITY_COLORS.MAJOR,
    },
    {
      min: ML_ANOMALY_THRESHOLD.CRITICAL,
      max: MAX_ANOMALY_SCORE,
      color: ML_SEVERITY_COLORS.CRITICAL,
    },
  ];
  const label = i18n.translate('xpack.ml.severitySelector.formControlLabel', {
    defaultMessage: 'Severity',
  });
  const resultValue = value ?? ML_ANOMALY_THRESHOLD.LOW;
  const ticks = new Array(5).fill(null).map((x, i) => {
    const v = i * 25;
    return { value: v, label: v };
  });

  return (
    <EuiFormRow fullWidth>
      <EuiFlexGroup gutterSize={'s'}>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            id="severityControl"
            style={{ width: '70px' }}
            compressed
            prepend={label}
            value={resultValue}
            onChange={(e) => onChange(Number(e.target.value))}
            min={ML_ANOMALY_THRESHOLD.LOW}
            max={MAX_ANOMALY_SCORE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiRange
            className={'mlSeverityControl'}
            fullWidth
            min={ML_ANOMALY_THRESHOLD.LOW}
            max={MAX_ANOMALY_SCORE}
            value={resultValue}
            onChange={(e) => onChange(Number(e.currentTarget.value))}
            aria-label={i18n.translate('xpack.ml.severitySelector.formControlAriaLabel', {
              defaultMessage: 'Select severity threshold',
            })}
            showTicks
            ticks={ticks}
            showRange={false}
            levels={levels}
            data-test-subj={'mlAnomalyAlertScoreSelection'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});
