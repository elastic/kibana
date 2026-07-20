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

import { getTimingBoundHelpText, type HelpTextBound } from '@kbn/data-lifecycle-phases';
import type { PreservedTimeUnit, TimeUnit } from '../types';
import { formatDuration, getUnitSelectOptions } from '../../../shared';
import { getStepIndexFromArrayItemPath, toMilliseconds } from '../utils';
import { MAX_DOWNSAMPLE_STEPS } from '../constants';
import {
  afterBeforeExitBoundary,
  afterGreaterThanPreviousStep,
  afterMustBeInteger,
  afterMustBeNonNegative,
  requiredAfterValue,
} from '../validations';
import { useOnStepFieldErrorsChange } from '../error_tracking';

export interface AfterFieldProps {
  item: ArrayItem;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  /** Delete phase (data retention) — the upper bound used when no frozen phase is configured. */
  dataRetentionMs?: number;
  dataRetentionEsFormat?: string;
  /** Frozen phase transition, when configured. When present it takes over as the upper bound
   * (downsampling must finish before the data is frozen) for both help text and validation. */
  frozenAfterMs?: number;
  frozenAfterEsFormat?: string;
}

const getAfterFieldsToValidateOnChange = (stepIndex: number, includeCurrent = true) => {
  const start = includeCurrent ? stepIndex : stepIndex + 1;
  return Array.from({ length: MAX_DOWNSAMPLE_STEPS }, (_, i) => i)
    .filter((i) => i >= start)
    .flatMap((i) => [
      `_meta.downsampleSteps[${i}].afterValue`,
      `_meta.downsampleSteps[${i}].afterToMilliSeconds`,
    ]);
};

const AfterFieldControl = ({
  stepIndex,
  dataTestSubj,
  timeUnitOptions,
  valueField,
  unitField,
  millisField,
  dataRetentionEsFormat,
  frozenAfterEsFormat,
}: {
  stepIndex: number;
  dataTestSubj: string;
  timeUnitOptions: ReadonlyArray<{ value: TimeUnit; text: string }>;
  valueField: FieldHook<string>;
  unitField: FieldHook<PreservedTimeUnit>;
  millisField: FieldHook<number>;
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

  const getAfterDurationAt = (index: number): string | undefined => {
    const value = String(
      form.getFields()[`_meta.downsampleSteps[${index}].afterValue`]?.value ?? ''
    ).trim();
    const unit = String(
      form.getFields()[`_meta.downsampleSteps[${index}].afterUnit`]?.value ?? 'd'
    );
    // "after" must be a non-negative integer; skip the label for invalid values so a half-typed
    // previous step doesn't render "NaNd" or "-1d".
    return formatDuration(value, unit, { integerOnly: true, minInclusive: 0 });
  };

  const lowerValue = stepIndex > 0 ? getAfterDurationAt(stepIndex - 1) : undefined;

  // The step should occur before the data reaches the frozen phase if one is configured, otherwise
  // before the delete phase (data retention).
  let upper: HelpTextBound | undefined;
  if (frozenAfterEsFormat) {
    upper = { neighbor: { type: 'phase', phase: 'frozen' }, value: frozenAfterEsFormat };
  } else if (dataRetentionEsFormat) {
    upper = { neighbor: { type: 'phase', phase: 'delete' }, value: dataRetentionEsFormat };
  }

  const helpText = getTimingBoundHelpText({
    lower: lowerValue ? { neighbor: { type: 'previousStep' }, value: lowerValue } : undefined,
    upper,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.editDslStepsFlyout.afterLabel', {
        defaultMessage: 'Downsample after',
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
            min={0}
            aria-label={i18n.translate('xpack.streams.editDslStepsFlyout.afterAriaLabel', {
              defaultMessage: 'Downsample after value',
            })}
            value={draftValue}
            isInvalid={isInvalid}
            data-test-subj={`${dataTestSubj}AfterValue`}
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
                millisField.setValue(toMilliseconds(nextValue, currentUnit));
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            fullWidth
            aria-label={i18n.translate('xpack.streams.editDslStepsFlyout.afterUnitAriaLabel', {
              defaultMessage: 'After unit',
            })}
            options={getUnitSelectOptions(timeUnitOptions, currentUnit)}
            value={currentUnit}
            data-test-subj={`${dataTestSubj}AfterUnit`}
            onChange={(e) => {
              const nextUnit = e.target.value as PreservedTimeUnit;
              unitField.setValue(nextUnit);
              const millis =
                committedValue.trim() === '' ? -1 : toMilliseconds(committedValue, nextUnit);
              millisField.setValue(millis);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const AfterField = ({
  item,
  dataTestSubj,
  timeUnitOptions,
  dataRetentionMs,
  dataRetentionEsFormat,
  frozenAfterMs,
  frozenAfterEsFormat,
}: AfterFieldProps) => {
  const form = useFormContext();
  const stepIndex = getStepIndexFromArrayItemPath(item.path);

  const valuePath = `${item.path}.afterValue`;
  const unitPath = `${item.path}.afterUnit`;
  const millisPath = `${item.path}.afterToMilliSeconds`;

  useFormData({
    form,
    watch: useMemo(() => {
      const indices = [stepIndex - 1, stepIndex, stepIndex + 1].filter(
        (i) => i >= 0 && i < MAX_DOWNSAMPLE_STEPS
      );
      return indices.flatMap((i) => [
        `_meta.downsampleSteps[${i}].afterValue`,
        `_meta.downsampleSteps[${i}].afterUnit`,
      ]);
    }, [stepIndex]),
  });

  const onStepFieldErrorsChange = useOnStepFieldErrorsChange();
  const onAfterErrorsChange = useCallback(
    (errors: string[] | null) => {
      onStepFieldErrorsChange?.(item.path, 'after', errors);
    },
    [item.path, onStepFieldErrorsChange]
  );

  const afterFieldsToValidateOnChange = useMemo(
    () => getAfterFieldsToValidateOnChange(stepIndex),
    [stepIndex]
  );

  const afterValueValidations = useMemo(() => {
    // Downsampling must finish before the data is frozen if a frozen phase is configured; otherwise
    // before it is deleted (data retention).
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
      { validator: requiredAfterValue },
      { validator: afterMustBeNonNegative },
      { validator: afterMustBeInteger },
      ...(stepIndex <= 0 ? [] : [{ validator: afterGreaterThanPreviousStep }]),
      ...(exitBoundary ? [{ validator: afterBeforeExitBoundary(exitBoundary) }] : []),
    ];
  }, [dataRetentionEsFormat, dataRetentionMs, frozenAfterEsFormat, frozenAfterMs, stepIndex]);

  const afterValueConfig = useMemo(
    () => ({
      defaultValue: '',
      fieldsToValidateOnChange: afterFieldsToValidateOnChange,
      validations: afterValueValidations,
    }),
    [afterFieldsToValidateOnChange, afterValueValidations]
  );

  const afterUnitConfig = useMemo(
    () => ({
      defaultValue: 'd',
      fieldsToValidateOnChange: afterFieldsToValidateOnChange,
    }),
    [afterFieldsToValidateOnChange]
  );

  const afterMillisConfig = useMemo(
    () => ({
      defaultValue: -1,
      fieldsToValidateOnChange: afterFieldsToValidateOnChange,
    }),
    [afterFieldsToValidateOnChange]
  );

  return (
    <UseField
      path={valuePath}
      readDefaultValueOnForm={!item.isNew}
      config={afterValueConfig}
      onError={onAfterErrorsChange}
    >
      {(valueField) => (
        <UseField path={unitPath} readDefaultValueOnForm={!item.isNew} config={afterUnitConfig}>
          {(unitField) => (
            <UseField
              path={millisPath}
              readDefaultValueOnForm={!item.isNew}
              config={afterMillisConfig}
            >
              {(millisField) => (
                <AfterFieldControl
                  stepIndex={stepIndex}
                  dataTestSubj={dataTestSubj}
                  timeUnitOptions={timeUnitOptions}
                  valueField={valueField as FieldHook<string>}
                  unitField={unitField as FieldHook<PreservedTimeUnit>}
                  millisField={millisField as FieldHook<number>}
                  dataRetentionEsFormat={dataRetentionEsFormat}
                  frozenAfterEsFormat={frozenAfterEsFormat}
                />
              )}
            </UseField>
          )}
        </UseField>
      )}
    </UseField>
  );
};
