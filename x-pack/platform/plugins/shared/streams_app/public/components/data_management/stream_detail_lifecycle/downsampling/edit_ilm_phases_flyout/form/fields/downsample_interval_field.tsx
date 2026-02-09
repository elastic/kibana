/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import type { TimeUnit } from '../types';
import { formatMillisecondsInUnit, getRelativeBoundsInMs, toMilliseconds } from '../utils';
import { useOnFieldErrorsChange } from '../error_tracking';

export interface DownsampleIntervalFieldProps {
  phaseName: PhaseName;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  isEnabled: boolean;
}

export const DownsampleIntervalField = ({
  phaseName,
  dataTestSubj,
  timeUnitOptions,
  isEnabled,
}: DownsampleIntervalFieldProps) => {
  const form = useFormContext();
  const valuePath = `_meta.${phaseName}.downsample.fixedIntervalValue`;
  const unitPath = `_meta.${phaseName}.downsample.fixedIntervalUnit`;
  const onFieldErrorsChange = useOnFieldErrorsChange();

  useFormData({
    form,
    watch: [
      '_meta.hot.enabled',
      '_meta.hot.downsampleEnabled',
      '_meta.hot.downsample.fixedIntervalValue',
      '_meta.hot.downsample.fixedIntervalUnit',
      '_meta.warm.enabled',
      '_meta.warm.downsampleEnabled',
      '_meta.warm.downsample.fixedIntervalValue',
      '_meta.warm.downsample.fixedIntervalUnit',
      '_meta.cold.enabled',
      '_meta.cold.downsampleEnabled',
      '_meta.cold.downsample.fixedIntervalValue',
      '_meta.cold.downsample.fixedIntervalUnit',
    ],
  });

  const getPhaseDownsampleIntervalMs = (phase: 'hot' | 'warm' | 'cold'): number | null => {
    const phaseEnabled = Boolean(form.getFields()[`_meta.${phase}.enabled`]?.value);
    if (!phaseEnabled) return null;

    const downsampleEnabled = Boolean(form.getFields()[`_meta.${phase}.downsampleEnabled`]?.value);
    if (!downsampleEnabled) return null;

    const value = String(
      form.getFields()[`_meta.${phase}.downsample.fixedIntervalValue`]?.value ?? ''
    ).trim();
    if (!value) return null;

    const unit = String(
      form.getFields()[`_meta.${phase}.downsample.fixedIntervalUnit`]?.value ?? 'd'
    ) as TimeUnit;
    const ms = toMilliseconds(value, unit);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  };

  return (
    <UseField path={valuePath} onError={(errors) => onFieldErrorsChange?.(valuePath, errors)}>
      {(valueField) => (
        <UseField path={unitPath}>
          {(unitField) => {
            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(valueField);
            const currentValue = String(valueField.value ?? '');
            const currentUnit = String(unitField.value ?? 'd') as TimeUnit;

            const showInvalid = isEnabled && isInvalid;
            const showError = isEnabled ? errorMessage : null;

            const downsamplePhases = ['hot', 'warm', 'cold'] as const;
            type DownsamplePhase = (typeof downsamplePhases)[number];
            const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
              downsamplePhases,
              phaseName as DownsamplePhase,
              getPhaseDownsampleIntervalMs
            );

            const helpText =
              upperBoundMs === undefined
                ? i18n.translate(
                    'xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpLowerBound',
                    {
                      defaultMessage: 'Must be larger than {min} based on current configuration.',
                      values: { min: formatMillisecondsInUnit(lowerBoundMs, currentUnit) },
                    }
                  )
                : i18n.translate(
                    'xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpRange',
                    {
                      defaultMessage:
                        'Must be larger than {min} and smaller than {max} based on current configuration.',
                      values: {
                        min: formatMillisecondsInUnit(lowerBoundMs, currentUnit),
                        max: formatMillisecondsInUnit(upperBoundMs, currentUnit),
                      },
                    }
                  );

            return (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.editIlmPhasesFlyout.downsamplingIntervalLabel',
                  {
                    defaultMessage: 'Interval',
                  }
                )}
                helpText={helpText}
                isInvalid={showInvalid}
                error={showError}
              >
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      compressed
                      fullWidth
                      value={currentValue}
                      disabled={!isEnabled}
                      isInvalid={showInvalid}
                      data-test-subj={`${dataTestSubj}DownsamplingIntervalValue`}
                      onChange={(e) => valueField.onChange(e)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSelect
                      compressed
                      fullWidth
                      disabled={!isEnabled}
                      aria-label={i18n.translate(
                        'xpack.streams.editIlmPhasesFlyout.downsamplingUnitAria',
                        {
                          defaultMessage: 'Downsampling interval unit',
                        }
                      )}
                      options={timeUnitOptions.map((o) => ({ value: o.value, text: o.text }))}
                      value={currentUnit}
                      data-test-subj={`${dataTestSubj}DownsamplingIntervalUnit`}
                      onChange={(e) => unitField.setValue(e.target.value as TimeUnit)}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            );
          }}
        </UseField>
      )}
    </UseField>
  );
};
