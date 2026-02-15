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

import { getTimeUnitLabel } from '../../../../helpers/format_size_units';
import type { DownsamplePhase, PreservedTimeUnit, TimeUnit } from '../types';
import { DOWNSAMPLE_PHASES } from '../types';
import { formatMillisecondsInUnit, getRelativeBoundsInMs } from '../utils';
import { useOnFieldErrorsChange } from '../error_tracking';
import { getPhaseDurationMs } from '../get_phase_duration_ms';

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

  const getPhaseDownsampleIntervalMs = (phase: DownsamplePhase): number | null =>
    getPhaseDurationMs(form, phase, {
      valuePathSuffix: 'downsample.fixedIntervalValue',
      unitPathSuffix: 'downsample.fixedIntervalUnit',
      extraEnabledPathSuffix: 'downsampleEnabled',
    });

  return (
    <UseField path={valuePath} onError={(errors) => onFieldErrorsChange?.(valuePath, errors)}>
      {(valueField) => (
        <UseField path={unitPath}>
          {(unitField) => {
            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(valueField);
            const currentValue = String(valueField.value ?? '');
            const currentUnit = String(unitField.value ?? 'd') as PreservedTimeUnit;

            let unitOptions: Array<{ value: PreservedTimeUnit; text: string }> =
              timeUnitOptions.map((o) => ({ value: o.value, text: o.text }));
            const canShowNonDefaultUnit =
              currentUnit === 'ms' || currentUnit === 'micros' || currentUnit === 'nanos';
            if (canShowNonDefaultUnit) {
              // Preserve and display known non-default units that can appear in ILM policies.
              // We still only *offer* `d/h/m/s` by default.
              unitOptions = [
                ...unitOptions,
                { value: currentUnit, text: getTimeUnitLabel(currentUnit) },
              ];
            }

            const showInvalid = isEnabled && isInvalid;
            const showError = isEnabled ? errorMessage : null;

            const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
              DOWNSAMPLE_PHASES,
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
                helpText={showInvalid ? undefined : helpText}
                isInvalid={showInvalid}
                error={showError}
              >
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      compressed
                      min={0}
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
                      options={unitOptions}
                      value={currentUnit}
                      data-test-subj={`${dataTestSubj}DownsamplingIntervalUnit`}
                      onChange={(e) => unitField.setValue(e.target.value as PreservedTimeUnit)}
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
