/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import type { DownsamplePhase, PreservedTimeUnit, TimeUnit } from '../types';
import { DOWNSAMPLE_PHASES } from '../types';
import { getBoundsHelpTextValues, getUnitSelectOptions } from '../../../shared';
import { getRelativeBoundsInMs } from '../utils';
import { useOnFieldErrorsChange } from '../error_tracking';
import { getPhaseDurationMs } from '../get_phase_duration_ms';

export interface DownsampleIntervalFieldProps {
  phaseName: PhaseName;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  isEnabled: boolean;
}

const DownsampleIntervalFieldControl = ({
  phaseName,
  dataTestSubj,
  timeUnitOptions,
  isEnabled,
  valueField,
  unitField,
}: {
  phaseName: PhaseName;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  isEnabled: boolean;
  valueField: FieldHook<string>;
  unitField: FieldHook<PreservedTimeUnit>;
}) => {
  const form = useFormContext();

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(valueField);
  const committedValue = String(valueField.value ?? '');
  const currentUnit = String(unitField.value ?? 'd') as PreservedTimeUnit;

  const isEditingRef = useRef(false);
  const [draftValue, setDraftValue] = useState<string>(committedValue);

  useEffect(() => {
    if (isEditingRef.current) return;
    setDraftValue(committedValue);
  }, [committedValue]);

  const unitOptions = getUnitSelectOptions(timeUnitOptions, currentUnit);

  const showInvalid = isEnabled && isInvalid;
  const showError = isEnabled ? errorMessage : null;

  const getPhaseDownsampleIntervalMs = (phase: DownsamplePhase): number | null =>
    getPhaseDurationMs(form, phase, {
      valuePathSuffix: 'downsample.fixedIntervalValue',
      unitPathSuffix: 'downsample.fixedIntervalUnit',
      extraEnabledPathSuffix: 'downsampleEnabled',
    });

  const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
    DOWNSAMPLE_PHASES,
    phaseName as DownsamplePhase,
    getPhaseDownsampleIntervalMs
  );
  const { min, max } = getBoundsHelpTextValues({
    lowerBoundMs,
    upperBoundMs,
    unit: currentUnit,
  });

  const helpText =
    upperBoundMs === undefined
      ? i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpLowerBound', {
          defaultMessage: 'Must be larger than {min} based on current configuration.',
          values: { min },
        })
      : i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpRange', {
          defaultMessage:
            'Must be larger than {min} and smaller than {max} based on current configuration.',
          values: {
            min,
            max,
          },
        });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingIntervalLabel', {
        defaultMessage: 'Interval',
      })}
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
            aria-label={i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.downsamplingIntervalAriaLabel',
              {
                defaultMessage: 'Downsample interval value',
              }
            )}
            value={draftValue}
            disabled={!isEnabled}
            isInvalid={showInvalid}
            data-test-subj={`${dataTestSubj}DownsamplingIntervalValue`}
            onChange={(e) => {
              isEditingRef.current = true;
              const nextValue = e.target.value;
              setDraftValue(nextValue);
            }}
            onBlur={() => {
              isEditingRef.current = false;
              const nextValue = draftValue.trim();
              if (nextValue === '') {
                setDraftValue(committedValue);
                return;
              }

              // Commit only on blur.
              if (nextValue !== committedValue.trim()) {
                valueField.setValue(nextValue);
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            fullWidth
            disabled={!isEnabled}
            aria-label={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingUnitAria', {
              defaultMessage: 'Downsampling interval unit',
            })}
            options={unitOptions}
            value={currentUnit}
            data-test-subj={`${dataTestSubj}DownsamplingIntervalUnit`}
            onChange={(e) => {
              const nextUnit = e.target.value as PreservedTimeUnit;
              unitField.setValue(nextUnit);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

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

  return (
    <UseField path={valuePath} onError={(errors) => onFieldErrorsChange?.(valuePath, errors)}>
      {(valueField) => (
        <UseField path={unitPath}>
          {(unitField) => (
            <DownsampleIntervalFieldControl
              phaseName={phaseName}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={timeUnitOptions}
              isEnabled={isEnabled}
              valueField={valueField as FieldHook<string>}
              unitField={unitField as FieldHook<PreservedTimeUnit>}
            />
          )}
        </UseField>
      )}
    </UseField>
  );
};
