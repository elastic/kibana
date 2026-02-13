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
import { formatMillisecondsInUnit, getRelativeBoundsInMs, toMilliseconds } from '../utils';
import { useOnFieldErrorsChange } from '../error_tracking';
import { getPhaseDurationMs } from '../get_phase_duration_ms';
import type { PreservedTimeUnit, TimeUnit } from '../types';

export interface MinAgeFieldProps {
  phaseName: PhaseName | undefined;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
}

export const MinAgeField = ({ phaseName, dataTestSubj, timeUnitOptions }: MinAgeFieldProps) => {
  const form = useFormContext();
  const onFieldErrorsChange = useOnFieldErrorsChange();

  const shouldRender = Boolean(phaseName && phaseName !== 'hot');
  useFormData({
    form,
    watch: shouldRender
      ? [
          '_meta.warm.enabled',
          '_meta.warm.minAgeValue',
          '_meta.warm.minAgeUnit',
          '_meta.cold.enabled',
          '_meta.cold.minAgeValue',
          '_meta.cold.minAgeUnit',
          '_meta.frozen.enabled',
          '_meta.frozen.minAgeValue',
          '_meta.frozen.minAgeUnit',
          '_meta.delete.enabled',
          '_meta.delete.minAgeValue',
          '_meta.delete.minAgeUnit',
        ]
      : undefined,
  });

  if (!phaseName || phaseName === 'hot') return null;

  const isDeletePhase = phaseName === 'delete';
  const minAgeValuePath = `_meta.${phaseName}.minAgeValue`;
  const minAgeUnitPath = `_meta.${phaseName}.minAgeUnit`;
  const minAgeMillisPath = `_meta.${phaseName}.minAgeToMilliSeconds`;

  const getPhaseMinAgeMs = (phase: 'warm' | 'cold' | 'frozen' | 'delete'): number | null =>
    getPhaseDurationMs(form, phase, {
      valuePathSuffix: 'minAgeValue',
      unitPathSuffix: 'minAgeUnit',
    });

  const fieldLabel = isDeletePhase
    ? i18n.translate('xpack.streams.editIlmPhasesFlyout.deleteAfterLabel', {
        defaultMessage: 'Delete after data stored',
      })
    : i18n.translate('xpack.streams.editIlmPhasesFlyout.moveAfterLabel', {
        defaultMessage: 'Move after data stored',
      });

  return (
    <UseField
      path={minAgeValuePath}
      onError={(errors) => onFieldErrorsChange?.(minAgeValuePath, errors)}
    >
      {(minAgeValueField) => (
        <UseField path={minAgeUnitPath}>
          {(minAgeUnitField) => (
            <UseField path={minAgeMillisPath}>
              {(minAgeMillisField) => {
                const { isInvalid, errorMessage } =
                  getFieldValidityAndErrorMessage(minAgeValueField);

                const currentValue = String(minAgeValueField.value ?? '');
                const currentUnit = String(minAgeUnitField.value ?? 'd') as PreservedTimeUnit;

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

                const minAgePhases = ['warm', 'cold', 'frozen', 'delete'] as const;
                type MinAgePhase = (typeof minAgePhases)[number];
                const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
                  minAgePhases,
                  phaseName as MinAgePhase,
                  getPhaseMinAgeMs
                );

                const helpText =
                  upperBoundMs === undefined
                    ? i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeHelpLowerBound', {
                        defaultMessage: 'Must be larger than {min} based on current configuration.',
                        values: { min: formatMillisecondsInUnit(lowerBoundMs, currentUnit) },
                      })
                    : i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeHelpRange', {
                        defaultMessage:
                          'Must be larger than {min} and smaller than {max} based on current configuration.',
                        values: {
                          min: formatMillisecondsInUnit(lowerBoundMs, currentUnit),
                          max: formatMillisecondsInUnit(upperBoundMs, currentUnit),
                        },
                      });

                return (
                  <EuiFormRow
                    label={fieldLabel}
                    helpText={isInvalid ? undefined : helpText}
                    isInvalid={isInvalid}
                    error={errorMessage}
                  >
                    <EuiFlexGroup gutterSize="s" responsive={false}>
                      <EuiFlexItem>
                        <EuiFieldNumber
                          compressed
                          min={0}
                          fullWidth
                          value={currentValue}
                          isInvalid={isInvalid}
                          data-test-subj={`${dataTestSubj}MoveAfterValue`}
                          onChange={(e) => {
                            minAgeValueField.onChange(e);
                            const nextValue = e.target.value;

                            const millis =
                              nextValue.trim() === '' ? -1 : toMilliseconds(nextValue, currentUnit);
                            minAgeMillisField.setValue(millis);
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiSelect
                          compressed
                          fullWidth
                          aria-label={i18n.translate(
                            'xpack.streams.editIlmPhasesFlyout.moveAfterUnitAriaLabel',
                            {
                              defaultMessage: 'Move after unit',
                            }
                          )}
                          options={unitOptions}
                          value={currentUnit}
                          data-test-subj={`${dataTestSubj}MoveAfterUnit`}
                          onChange={(e) => {
                            const nextUnit = e.target.value as PreservedTimeUnit;
                            minAgeUnitField.setValue(nextUnit);

                            const millis =
                              currentValue.trim() === ''
                                ? -1
                                : toMilliseconds(currentValue, nextUnit);
                            minAgeMillisField.setValue(millis);
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFormRow>
                );
              }}
            </UseField>
          )}
        </UseField>
      )}
    </UseField>
  );
};
