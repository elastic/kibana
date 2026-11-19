/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { useController, useFormContext, useWatch } from 'react-hook-form';

import {
  BOUNDARY_VALIDATION_ERROR,
  getTimingBoundHelpText,
  type HelpTextBound,
} from '@kbn/data-lifecycle-phases';
import { formatDuration, getUnitSelectOptions, useBlurCommitDraft } from '../../../shared';
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
  const { draftValue, onChange, onBlur } = useBlurCommitDraft({
    committedValue,
    onFieldBlur: () => {
      minAgeValueField.onBlur();
    },
    onCommit: (next) => {
      minAgeValueField.onChange(next);
    },
    onAfterCommit: () => {
      setTimeout(() => {
        void trigger(getMinAgeFieldsToValidateOnChange(phaseName));
      }, 0);
    },
  });

  const getPhaseMinAgeMs = (phase: 'warm' | 'cold' | 'frozen' | 'delete'): number | null =>
    getPhaseDurationMs(getValues, phase, {
      valuePathSuffix: 'minAgeValue',
      unitPathSuffix: 'minAgeUnit',
    });

  const minAgePhases = ['warm', 'cold', 'frozen', 'delete'] as const;
  type MinAgePhase = (typeof minAgePhases)[number];
  // The nearest configured phase in each direction acts as a boundary. The hot phase is not
  // configurable (min age 0), so a phase with no earlier configured phase shows only the upper
  // bound (or nothing when it is also the last enabled phase).
  const { lowerBoundPhase, upperBoundPhase } = getRelativeBoundsInMs(
    minAgePhases,
    phaseName as MinAgePhase,
    getPhaseMinAgeMs
  );

  const toPhaseBound = (phase: MinAgePhase | undefined): HelpTextBound | undefined => {
    if (!phase) return undefined;
    const value = formatDuration(
      getValues(`_meta.${phase}.minAgeValue`),
      getValues(`_meta.${phase}.minAgeUnit`),
      { integerOnly: true, minExclusive: 0 }
    );
    if (!value) return undefined;
    return { neighbor: { type: 'phase', phase }, value };
  };

  const helpText = getTimingBoundHelpText({
    lower: toPhaseBound(lowerBoundPhase),
    upper: toPhaseBound(upperBoundPhase),
  });

  const isBoundaryError = isInvalid && errorMessage === BOUNDARY_VALIDATION_ERROR;

  return (
    <EuiFormRow
      label={fieldLabel}
      helpText={isBoundaryError ? undefined : helpText}
      isInvalid={isInvalid}
      error={isBoundaryError ? helpText : isInvalid ? errorMessage : null}
    >
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
              onChange(e.target.value);
            }}
            onBlur={() => {
              onBlur();
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
        defaultMessage: 'Delete after',
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
