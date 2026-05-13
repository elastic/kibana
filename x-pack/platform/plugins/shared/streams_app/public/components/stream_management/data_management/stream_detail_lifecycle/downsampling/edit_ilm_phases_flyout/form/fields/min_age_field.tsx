/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController, useFormContext, useWatch } from 'react-hook-form';

import { getBoundsHelpTextValues, getUnitSelectOptions } from '../../../shared';
import { getRelativeBoundsInMs } from '../utils';
import { getPhaseDurationMs } from '../get_phase_duration_ms';
import { getMinAgeFieldsToValidateOnChange } from '../schema';
import type { PreservedTimeUnit, TimeUnit } from '../types';
import type { IlmPhasesFlyoutFormInternal } from '../types';

export interface MinAgeFieldProps {
  phaseName: PhaseName | undefined;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
}

const MinAgeFieldControl = ({
  phaseName,
  dataTestSubj,
  timeUnitOptions,
  fieldLabel,
  fieldAriaLabel,
}: {
  phaseName: Exclude<PhaseName, 'hot'>;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  fieldLabel: string;
  fieldAriaLabel: string;
}) => {
  const { control, getValues, trigger } = useFormContext<IlmPhasesFlyoutFormInternal>();

  const minAgeValuePath = `_meta.${phaseName}.minAgeValue` as const;
  const minAgeUnitPath = `_meta.${phaseName}.minAgeUnit` as const;

  const { field: minAgeValueField, fieldState: minAgeValueFieldState } = useController({
    control,
    name: minAgeValuePath,
  });
  const { field: minAgeUnitField } = useController({
    control,
    name: minAgeUnitPath,
  });

  const isInvalid = Boolean(minAgeValueFieldState.error);
  const errorMessage = minAgeValueFieldState.error?.message;

  const committedValue = String(minAgeValueField.value ?? '');
  const currentUnit = String(minAgeUnitField.value ?? 'd') as PreservedTimeUnit;

  const isEditingRef = useRef(false);
  const [draftValue, setDraftValue] = useState<string>(committedValue);

  useEffect(() => {
    if (isEditingRef.current) return;
    setDraftValue(committedValue);
  }, [committedValue]);

  const getPhaseMinAgeMs = (phase: 'warm' | 'cold' | 'frozen' | 'delete'): number | null =>
    getPhaseDurationMs(getValues, phase, {
      valuePathSuffix: 'minAgeValue',
      unitPathSuffix: 'minAgeUnit',
    });

  const minAgePhases = ['warm', 'cold', 'frozen', 'delete'] as const;
  type MinAgePhase = (typeof minAgePhases)[number];
  const { lowerBoundMs, upperBoundMs } = getRelativeBoundsInMs(
    minAgePhases,
    phaseName as MinAgePhase,
    getPhaseMinAgeMs
  );

  const { min, max } = getBoundsHelpTextValues({
    lowerBoundMs,
    upperBoundMs,
    unit: currentUnit,
  });

  const helpText =
    upperBoundMs === undefined
      ? i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeHelpLowerBound', {
          defaultMessage: 'Must be larger than {min} based on current configuration.',
          values: { min },
        })
      : i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeHelpRange', {
          defaultMessage:
            'Must be larger than {min} and smaller than {max} based on current configuration.',
          values: {
            min,
            max,
          },
        });

  return (
    <EuiFormRow label={fieldLabel} helpText={helpText} isInvalid={isInvalid} error={errorMessage}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            min={0}
            fullWidth
            aria-label={fieldAriaLabel}
            value={draftValue}
            isInvalid={isInvalid}
            data-test-subj={`${dataTestSubj}MoveAfterValue`}
            inputRef={minAgeValueField.ref}
            onChange={(e) => {
              isEditingRef.current = true;
              const nextValue = e.target.value;
              setDraftValue(nextValue);
            }}
            onBlur={() => {
              isEditingRef.current = false;
              minAgeValueField.onBlur();
              const nextValue = draftValue.trim();
              if (nextValue === '') {
                setDraftValue(committedValue);
                return;
              }

              // Commit only on blur.
              if (nextValue !== committedValue.trim()) {
                minAgeValueField.onChange(nextValue);
              }

              setTimeout(() => {
                void trigger(getMinAgeFieldsToValidateOnChange(phaseName));
              }, 0);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            fullWidth
            aria-label={i18n.translate('xpack.streams.editIlmPhasesFlyout.moveAfterUnitAriaLabel', {
              defaultMessage: 'Move data after unit',
            })}
            options={getUnitSelectOptions(timeUnitOptions, currentUnit)}
            value={currentUnit}
            data-test-subj={`${dataTestSubj}MoveAfterUnit`}
            onChange={(e) => {
              const nextUnit = e.target.value as PreservedTimeUnit;
              minAgeUnitField.onChange(nextUnit);

              setTimeout(() => {
                void trigger(getMinAgeFieldsToValidateOnChange(phaseName));
              }, 0);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const MinAgeField = ({ phaseName, dataTestSubj, timeUnitOptions }: MinAgeFieldProps) => {
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();

  useWatch({
    control,
    name: [
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
    ],
  });

  if (!phaseName || phaseName === 'hot') return null;

  const isDeletePhase = phaseName === 'delete';

  const fieldLabel = isDeletePhase
    ? i18n.translate('xpack.streams.editIlmPhasesFlyout.deleteAfterLabel', {
        defaultMessage: 'Delete after data stored',
      })
    : i18n.translate('xpack.streams.editIlmPhasesFlyout.moveAfterLabel', {
        defaultMessage: 'Move data after',
      });

  const fieldAriaLabel = isDeletePhase
    ? i18n.translate('xpack.streams.editIlmPhasesFlyout.deleteAfterAriaLabel', {
        defaultMessage: 'Delete after value',
      })
    : i18n.translate('xpack.streams.editIlmPhasesFlyout.moveAfterAriaLabel', {
        defaultMessage: 'Move data after value',
      });

  return (
    <MinAgeFieldControl
      phaseName={phaseName}
      dataTestSubj={dataTestSubj}
      timeUnitOptions={timeUnitOptions}
      fieldLabel={fieldLabel}
      fieldAriaLabel={fieldAriaLabel}
    />
  );
};
