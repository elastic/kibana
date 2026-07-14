/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  type ArrayItem,
  getFieldValidityAndErrorMessage,
  type FieldHook,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import type { PreservedTimeUnit, TimeUnit } from '../types';
import {
  formatDuration,
  getIntervalBoundHelpText,
  getMultipleStepAttributes,
  getUnitSelectOptions,
} from '../../../shared';
import { getStepIndexFromArrayItemPath, toMilliseconds } from '../utils';
import { MAX_DOWNSAMPLE_STEPS } from '../constants';
import {
  fixedIntervalBeforeExitBoundary,
  fixedIntervalMultipleOfPreviousStep,
  fixedIntervalMustBeGreaterThanZero,
  fixedIntervalMustBeAtLeastFiveMinutes,
  fixedIntervalMustBeInteger,
  requiredFixedIntervalValue,
} from '../validations';
import { useOnStepFieldErrorsChange } from '../error_tracking';

export interface FixedIntervalFieldProps {
  item: ArrayItem;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  /** Delete phase (data retention) — the interval's upper bound when no frozen phase is set. */
  dataRetentionMs?: number;
  dataRetentionEsFormat?: string;
  /** Frozen phase transition — takes over as the interval's upper bound when configured. */
  frozenAfterMs?: number;
  frozenAfterEsFormat?: string;
}

const FIXED_INTERVAL_FIELDS_TO_VALIDATE_ON_CHANGE = Array.from(
  { length: MAX_DOWNSAMPLE_STEPS },
  (_, i) => `_meta.downsampleSteps[${i}].fixedIntervalValue`
);

const FixedIntervalFieldControl = ({
  stepIndex,
  dataTestSubj,
  timeUnitOptions,
  valueField,
  unitField,
  dataRetentionEsFormat,
  frozenAfterEsFormat,
}: {
  stepIndex: number;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  valueField: FieldHook<string>;
  unitField: FieldHook<PreservedTimeUnit>;
  dataRetentionEsFormat?: string;
  frozenAfterEsFormat?: string;
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

  const getFixedIntervalMsAt = (index: number): number | undefined => {
    const value = String(
      form.getFields()[`_meta.downsampleSteps[${index}].fixedIntervalValue`]?.value ?? ''
    ).trim();
    const unit = String(
      form.getFields()[`_meta.downsampleSteps[${index}].fixedIntervalUnit`]?.value ?? 'd'
    ) as PreservedTimeUnit;
    if (value === '') return;
    const ms = toMilliseconds(value, unit);
    return Number.isFinite(ms) && ms > 0 ? ms : undefined;
  };

  const getFixedIntervalDurationAt = (index: number): string | undefined => {
    const value = String(
      form.getFields()[`_meta.downsampleSteps[${index}].fixedIntervalValue`]?.value ?? ''
    ).trim();
    const unit = String(
      form.getFields()[`_meta.downsampleSteps[${index}].fixedIntervalUnit`]?.value ?? 'd'
    );
    // An interval must be a positive integer; skip the label for invalid values so we don't render
    // things like "NaNd" or "0d" for a half-typed previous step.
    return formatDuration(value, unit, { integerOnly: true, minExclusive: 0 });
  };

  const lowerBoundMs = stepIndex > 0 ? getFixedIntervalMsAt(stepIndex - 1) ?? 0 : 0;
  const previousIntervalValue =
    stepIndex > 0 ? getFixedIntervalDurationAt(stepIndex - 1) : undefined;

  // The interval must be a multiple of the previous step's interval (referenced by step number) and
  // stay smaller than the frozen phase if one is configured, otherwise the delete phase.
  const multipleOf =
    previousIntervalValue !== undefined
      ? {
          neighbor: { type: 'stepInterval' as const, stepNumber: stepIndex },
          value: previousIntervalValue,
        }
      : undefined;
  const upper = frozenAfterEsFormat
    ? { neighbor: { type: 'phase' as const, phase: 'frozen' as const }, value: frozenAfterEsFormat }
    : dataRetentionEsFormat
    ? {
        neighbor: { type: 'phase' as const, phase: 'delete' as const },
        value: dataRetentionEsFormat,
      }
    : undefined;

  const helpText = getIntervalBoundHelpText({ multipleOf, upper });

  // The interval must be a multiple of the previous step's interval, so step the
  // increment/decrement buttons by that multiple (expressed in the current unit) whenever the
  // current value already sits on a valid multiple; otherwise fall back to stepping by 1.
  const { min, step } = getMultipleStepAttributes({
    currentValue: draftValue,
    unit: currentUnit,
    multipleOfMs: lowerBoundMs,
    baseMin: 1,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalLabel', {
        defaultMessage: 'Downsample interval',
      })}
      helpText={helpText}
      isInvalid={isInvalid}
      error={isInvalid ? errorMessage : null}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            fullWidth
            min={min}
            step={step}
            aria-label={i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalAriaLabel', {
              defaultMessage: 'Downsample interval value',
            })}
            value={draftValue}
            isInvalid={isInvalid}
            data-test-subj={`${dataTestSubj}FixedIntervalValue`}
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
            aria-label={i18n.translate(
              'xpack.streams.editDslStepsFlyout.fixedIntervalUnitAriaLabel',
              {
                defaultMessage: 'Fixed interval unit',
              }
            )}
            options={getUnitSelectOptions(timeUnitOptions, currentUnit)}
            value={currentUnit}
            data-test-subj={`${dataTestSubj}FixedIntervalUnit`}
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

export const FixedIntervalField = ({
  item,
  dataTestSubj,
  timeUnitOptions,
  dataRetentionMs,
  dataRetentionEsFormat,
  frozenAfterMs,
  frozenAfterEsFormat,
}: FixedIntervalFieldProps) => {
  const form = useFormContext();
  const valuePath = `${item.path}.fixedIntervalValue`;
  const unitPath = `${item.path}.fixedIntervalUnit`;
  const stepIndex = getStepIndexFromArrayItemPath(item.path);

  useFormData({
    form,
    watch: useMemo(() => {
      const indices = [stepIndex - 1, stepIndex, stepIndex + 1].filter(
        (i) => i >= 0 && i < MAX_DOWNSAMPLE_STEPS
      );
      return indices.flatMap((i) => [
        `_meta.downsampleSteps[${i}].fixedIntervalValue`,
        `_meta.downsampleSteps[${i}].fixedIntervalUnit`,
      ]);
    }, [stepIndex]),
  });

  const onStepFieldErrorsChange = useOnStepFieldErrorsChange();
  const onFixedIntervalErrorsChange = useCallback(
    (errors: string[] | null) => {
      onStepFieldErrorsChange?.(item.path, 'fixed_interval', errors);
    },
    [item.path, onStepFieldErrorsChange]
  );

  const fixedIntervalValueValidations = useMemo(() => {
    // The interval must stay smaller than the window where downsampling can happen: before the
    // frozen phase if configured, otherwise before deletion (data retention).
    const exitBoundary =
      frozenAfterMs !== undefined && frozenAfterEsFormat
        ? {
            boundaryMs: frozenAfterMs,
            boundaryEsFormat: frozenAfterEsFormat,
            phase: 'frozen' as const,
          }
        : dataRetentionMs !== undefined && dataRetentionEsFormat
        ? {
            boundaryMs: dataRetentionMs,
            boundaryEsFormat: dataRetentionEsFormat,
            phase: 'delete' as const,
          }
        : undefined;

    return [
      { validator: requiredFixedIntervalValue },
      { validator: fixedIntervalMustBeGreaterThanZero },
      { validator: fixedIntervalMustBeInteger },
      { validator: fixedIntervalMustBeAtLeastFiveMinutes },
      { validator: fixedIntervalMultipleOfPreviousStep },
      ...(exitBoundary ? [{ validator: fixedIntervalBeforeExitBoundary(exitBoundary) }] : []),
    ];
  }, [dataRetentionEsFormat, dataRetentionMs, frozenAfterEsFormat, frozenAfterMs]);

  const fixedIntervalValueConfig = useMemo(
    () => ({
      defaultValue: '1',
      fieldsToValidateOnChange: FIXED_INTERVAL_FIELDS_TO_VALIDATE_ON_CHANGE,
      validations: fixedIntervalValueValidations,
    }),
    [fixedIntervalValueValidations]
  );

  const fixedIntervalUnitConfig = useMemo(
    () => ({
      defaultValue: 'd',
      fieldsToValidateOnChange: FIXED_INTERVAL_FIELDS_TO_VALIDATE_ON_CHANGE,
    }),
    []
  );

  return (
    <UseField
      path={valuePath}
      readDefaultValueOnForm={!item.isNew}
      config={fixedIntervalValueConfig}
      onError={onFixedIntervalErrorsChange}
    >
      {(valueField) => (
        <UseField
          path={unitPath}
          readDefaultValueOnForm={!item.isNew}
          config={fixedIntervalUnitConfig}
        >
          {(unitField) => (
            <FixedIntervalFieldControl
              stepIndex={stepIndex}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={timeUnitOptions}
              valueField={valueField as FieldHook<string>}
              unitField={unitField as FieldHook<PreservedTimeUnit>}
              dataRetentionEsFormat={dataRetentionEsFormat}
              frozenAfterEsFormat={frozenAfterEsFormat}
            />
          )}
        </UseField>
      )}
    </UseField>
  );
};
