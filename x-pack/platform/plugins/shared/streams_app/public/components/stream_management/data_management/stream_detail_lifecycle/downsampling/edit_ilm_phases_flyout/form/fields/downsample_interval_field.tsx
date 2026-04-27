/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController, useFormContext, useWatch, type FieldPath } from 'react-hook-form';

import type { DownsamplePhase, PreservedTimeUnit, TimeUnit } from '../types';
import { DOWNSAMPLE_PHASES } from '../types';
import { getBoundsHelpTextValues, getUnitSelectOptions } from '../../../shared';
import { getRelativeBoundsInMs } from '../utils';
import { getPhaseDurationMs } from '../get_phase_duration_ms';
import type { IlmPhasesFlyoutFormInternal } from '../types';
import { getDownsampleFieldsToValidateOnChange } from '../schema';

export interface DownsampleIntervalFieldProps {
  phaseName: DownsamplePhase;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  isEnabled: boolean;
}

const DownsampleIntervalFieldControl = ({
  phaseName,
  dataTestSubj,
  timeUnitOptions,
  isEnabled,
}: {
  phaseName: DownsamplePhase;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  isEnabled: boolean;
}) => {
  const { control, getValues, trigger } = useFormContext<IlmPhasesFlyoutFormInternal>();

  const valuePath =
    `_meta.${phaseName}.downsample.fixedIntervalValue` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
  const unitPath =
    `_meta.${phaseName}.downsample.fixedIntervalUnit` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;

  const { field: valueField, fieldState: valueFieldState } = useController({
    control,
    name: valuePath,
  });
  const { field: unitField } = useController({
    control,
    name: unitPath,
  });

  const isInvalid = Boolean(valueFieldState.error);
  const errorMessage = valueFieldState.error?.message;
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
    getPhaseDurationMs(getValues, phase, {
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

  const showMultipleOfPreviousPhase = lowerBoundMs > 0;
  const helpText =
    upperBoundMs === undefined
      ? showMultipleOfPreviousPhase
        ? i18n.translate(
            'xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpLowerBoundMultiple',
            {
              defaultMessage:
                'Must be larger than {min} and a multiple of {multipleOf} based on current configuration.',
              values: { min, multipleOf: min },
            }
          )
        : i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpLowerBound', {
            defaultMessage: 'Must be larger than {min} based on current configuration.',
            values: { min },
          })
      : showMultipleOfPreviousPhase
      ? i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingIntervalHelpRangeMultiple', {
          defaultMessage:
            'Must be larger than {min}, smaller than {max}, and a multiple of {multipleOf} based on current configuration.',
          values: {
            min,
            max,
            multipleOf: min,
          },
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
      helpText={helpText}
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
            inputRef={valueField.ref}
            onChange={(e) => {
              isEditingRef.current = true;
              const nextValue = e.target.value;
              setDraftValue(nextValue);
            }}
            onBlur={() => {
              isEditingRef.current = false;
              valueField.onBlur();
              const nextValue = draftValue.trim();
              if (nextValue === '') {
                setDraftValue(committedValue);
                return;
              }

              // Commit only on blur.
              if (nextValue !== committedValue.trim()) {
                valueField.onChange(nextValue);
              }

              void trigger(getDownsampleFieldsToValidateOnChange(phaseName));
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
              unitField.onChange(nextUnit);

              void trigger(getDownsampleFieldsToValidateOnChange(phaseName));
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
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();

  useWatch({
    control,
    name: [
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
    <DownsampleIntervalFieldControl
      phaseName={phaseName}
      dataTestSubj={dataTestSubj}
      timeUnitOptions={timeUnitOptions}
      isEnabled={isEnabled}
    />
  );
};
