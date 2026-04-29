/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiRange, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { i18n } from '@kbn/i18n';

export interface ControlSliderProps {
  /** Allowed values to show on the Control Slider */
  values: Array<{ label: string; value: number; accessibleLabel?: string }>;
  /** Current value set */
  currentValue: number | undefined;
  /** When set will show the control in a disabled state */
  disabled?: boolean;
  /** An explanation for the disabled state of the control */
  disabledReason?: string;
  /** A way to pass the test id parameter */
  'data-test-subj'?: string;
  /** A callback for when the slider value changes */
  onChange: (newValue: number) => void;
}

export function ControlSlider({
  values,
  currentValue,
  disabled = false,
  disabledReason = '',
  onChange,
  'data-test-subj': dataTestSubj,
}: ControlSliderProps) {
  const { euiTheme } = useEuiTheme();

  const samplingIndex = values.findIndex((v) => v.value === currentValue);
  const currentSamplingIndex = samplingIndex > -1 ? samplingIndex : values.length - 1;

  return (
    <TooltipWrapper
      tooltipContent={disabledReason}
      condition={disabled}
      delay="regular"
      display="block"
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText
            color={disabled ? euiTheme.colors.disabledText : euiTheme.colors.subduedText}
            size="xs"
          >
            <FormattedMessage
              id="randomSampling.ui.sliderControl.performanceLabel"
              defaultMessage="Performance"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiRange
            data-test-subj={dataTestSubj}
            aria-label={i18n.translate('randomSampling.ui.sliderControl.ariaLabel', {
              defaultMessage: 'Sampling percentages',
            })}
            aria-describedby={i18n.translate('randomSampling.ui.sliderControl.ariaDescribedby', {
              defaultMessage:
                'Lower sampling percentages increases the performance, but lowers the accuracy. Lower sampling percentages are best for large datasets.',
            })}
            value={currentSamplingIndex}
            disabled={disabled}
            fullWidth
            onChange={(e) => {
              onChange(values[Number(e.currentTarget.value)].value);
            }}
            showInput={false}
            showRange={false}
            showTicks
            step={1}
            min={0}
            max={values.length - 1}
            ticks={values.map((tick, index) => ({
              ...tick,
              value: index,
            }))}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            color={disabled ? euiTheme.colors.disabledText : euiTheme.colors.subduedText}
            size="xs"
          >
            <FormattedMessage
              id="randomSampling.ui.sliderControl.accuracyLabel"
              defaultMessage="Accuracy"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </TooltipWrapper>
  );
}
