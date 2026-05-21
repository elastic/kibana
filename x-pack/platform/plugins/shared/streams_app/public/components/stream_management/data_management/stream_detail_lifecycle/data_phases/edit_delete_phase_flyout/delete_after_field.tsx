/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { getUnitSelectOptions, TIME_UNIT_OPTIONS, type PreservedTimeUnit } from '../shared';
import type { EditDeletePhaseFlyoutForm } from './form';
import { editDeletePhaseFlyoutI18n } from './i18n';

export interface DeleteAfterFieldProps {
  dataTestSubj: string;
  isDisabled?: boolean;
  labelAppend?: React.ReactNode;
  helpText?: string;
}

export const DeleteAfterField = ({
  dataTestSubj,
  isDisabled = false,
  labelAppend,
  helpText,
}: DeleteAfterFieldProps) => {
  const { control, getValues, setValue, trigger } = useFormContext<EditDeletePhaseFlyoutForm>();
  const { field: valueField, fieldState: valueFieldState } = useController({
    control,
    name: 'minAgeValue',
  });
  const { field: unitField } = useController({
    control,
    name: 'minAgeUnit',
  });

  const isInvalid = Boolean(valueFieldState.error) && !isDisabled;
  const errorMessage = isDisabled ? null : valueFieldState.error?.message;
  const committedValue = String(valueField.value ?? '');
  const currentUnit: PreservedTimeUnit = unitField.value ?? 'd';

  const isEditingRef = useRef(false);
  const [draftValue, setDraftValue] = useState<string>(committedValue);

  useEffect(() => {
    if (isEditingRef.current) return;
    setDraftValue(committedValue);
  }, [committedValue]);

  const displayedHelpText = isInvalid && helpText === errorMessage ? undefined : helpText;

  return (
    <EuiFormRow
      label={editDeletePhaseFlyoutI18n.deleteAfterLabel}
      labelAppend={labelAppend}
      helpText={displayedHelpText}
      isInvalid={isInvalid}
    >
      <>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem>
            <EuiFieldNumber
              compressed
              min={0}
              fullWidth
              disabled={isDisabled}
              aria-label={editDeletePhaseFlyoutI18n.deleteAfterValueAriaLabel}
              value={draftValue}
              isInvalid={isInvalid}
              data-test-subj={`${dataTestSubj}DeleteAfterValue`}
              inputRef={valueField.ref}
              onChange={(e) => {
                isEditingRef.current = true;
                setDraftValue(e.target.value);
                if (getValues('isUsingDefaultRetention')) {
                  setValue('isUsingDefaultRetention', false, { shouldDirty: true });
                }
              }}
              onBlur={() => {
                isEditingRef.current = false;
                const nextValue = draftValue.trim();
                if (nextValue === '') {
                  setDraftValue(committedValue);
                  valueField.onBlur();
                  return;
                }

                if (nextValue !== committedValue.trim()) {
                  valueField.onChange(nextValue);
                }
                valueField.onBlur();
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              compressed
              fullWidth
              disabled={isDisabled}
              aria-label={editDeletePhaseFlyoutI18n.deleteAfterUnitAriaLabel}
              options={getUnitSelectOptions(TIME_UNIT_OPTIONS, currentUnit)}
              value={currentUnit}
              data-test-subj={`${dataTestSubj}DeleteAfterUnit`}
              onChange={(e) => {
                unitField.onChange(e.target.value as PreservedTimeUnit);
                if (getValues('isUsingDefaultRetention')) {
                  setValue('isUsingDefaultRetention', false, { shouldDirty: true });
                }

                // RHF updates the controlled select field before the resolver sees the new unit; deferring
                // ensures the subsequent validation uses the latest unit value.
                setTimeout(() => {
                  void trigger('minAgeValue');
                }, 0);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {isInvalid && errorMessage ? (
          <EuiFormErrorText data-test-subj={`${dataTestSubj}DeleteAfterError`}>
            {errorMessage}
          </EuiFormErrorText>
        ) : null}
      </>
    </EuiFormRow>
  );
};
