/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  type ArrayItem,
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import type { PreservedTimeUnit, TimeUnit } from '../types';
import { getBoundsHelpTextValues, getUnitSelectOptions } from '../../../shared';
import { getStepIndexFromArrayItemPath, toMilliseconds } from '../utils';
import { MAX_DOWNSAMPLE_STEPS } from '../constants';
import {
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
}

const FIXED_INTERVAL_FIELDS_TO_VALIDATE_ON_CHANGE = Array.from(
  { length: MAX_DOWNSAMPLE_STEPS },
  (_, i) => `_meta.downsampleSteps[${i}].fixedIntervalValue`
);

export const FixedIntervalField = ({
  item,
  dataTestSubj,
  timeUnitOptions,
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

  const fixedIntervalValueValidations = useMemo(
    () => [
      { validator: requiredFixedIntervalValue },
      { validator: fixedIntervalMustBeGreaterThanZero },
      { validator: fixedIntervalMustBeInteger },
      { validator: fixedIntervalMustBeAtLeastFiveMinutes },
      { validator: fixedIntervalMultipleOfPreviousStep },
    ],
    []
  );

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
          {(unitField) => {
            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(valueField);
            const currentValue = String(valueField.value ?? '');
            const currentUnit = String(unitField.value ?? 'd') as PreservedTimeUnit;

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

            const lowerBoundMs = stepIndex > 0 ? getFixedIntervalMsAt(stepIndex - 1) ?? 0 : 0;
            const upperBoundMs =
              stepIndex < MAX_DOWNSAMPLE_STEPS - 1
                ? getFixedIntervalMsAt(stepIndex + 1)
                : undefined;
            const { min, max } = getBoundsHelpTextValues({
              lowerBoundMs,
              upperBoundMs,
              unit: currentUnit,
            });

            const helpText =
              upperBoundMs === undefined
                ? i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalHelpLowerBound', {
                    defaultMessage: 'Must be larger than {min} based on current configuration.',
                    values: { min },
                  })
                : i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalHelpRange', {
                    defaultMessage:
                      'Must be larger than {min} and smaller than {max} based on current configuration.',
                    values: {
                      min,
                      max,
                    },
                  });

            return (
              <EuiFormRow
                label={i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalLabel', {
                  defaultMessage: 'Downsample interval',
                })}
                helpText={isInvalid ? undefined : helpText}
                isInvalid={isInvalid}
                error={isInvalid ? errorMessage : null}
              >
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiFieldNumber
                      compressed
                      fullWidth
                      min={1}
                      aria-label={i18n.translate(
                        'xpack.streams.editDslStepsFlyout.fixedIntervalAriaLabel',
                        {
                          defaultMessage: 'Downsample interval value',
                        }
                      )}
                      value={currentValue}
                      isInvalid={isInvalid}
                      data-test-subj={`${dataTestSubj}FixedIntervalValue`}
                      onChange={(e) => valueField.onChange(e)}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSelect
                      compressed
                      fullWidth
                      aria-label={i18n.translate(
                        'xpack.streams.editDslStepsFlyout.fixedIntervalUnitAriaLabel',
                        { defaultMessage: 'Fixed interval unit' }
                      )}
                      options={getUnitSelectOptions(timeUnitOptions, currentUnit)}
                      value={currentUnit}
                      data-test-subj={`${dataTestSubj}FixedIntervalUnit`}
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
