/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  type EuiSelectOption,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';

import { BOUNDARY_VALIDATION_ERROR } from '@kbn/data-lifecycle-phases';
import { useBlurCommitDraft } from '../../../shared';
import type { DlmPhasesFlyoutFormInternal } from '../types';

export const AfterField = ({
  phase,
  label,
  dataTestSubj,
  isDisabled,
  isInvalid,
  error,
  helpText,
  timeUnitOptions,
  validatePathsOnCommit,
}: {
  phase: 'frozen' | 'delete';
  label: string;
  dataTestSubj: string;
  isDisabled: boolean;
  isInvalid: boolean;
  error?: string;
  helpText?: React.ReactNode;
  timeUnitOptions: ReadonlyArray<EuiSelectOption>;
  validatePathsOnCommit: ReadonlyArray<'frozen.afterValue' | 'delete.afterValue'>;
}) => {
  const { control, trigger } = useFormContext<DlmPhasesFlyoutFormInternal>();

  const afterValuePath = `${phase}.afterValue` as const;
  const afterUnitPath = `${phase}.afterUnit` as const;

  const { field: afterValueField } = useController({
    control,
    name: afterValuePath,
  });
  const { field: afterUnitField } = useController({
    control,
    name: afterUnitPath,
  });

  const committedValue = String(afterValueField.value ?? '');
  const draft = useBlurCommitDraft({
    committedValue,
    isDisabled,
    onFieldBlur: () => afterValueField.onBlur(),
    onCommit: (next) => afterValueField.onChange(next),
    onAfterCommit: () => {
      setTimeout(() => {
        void trigger(validatePathsOnCommit);
      }, 0);
    },
  });

  const isBoundaryError = isInvalid && error === BOUNDARY_VALIDATION_ERROR;

  return (
    <EuiFormRow
      fullWidth
      label={label}
      helpText={isBoundaryError ? undefined : helpText}
      isInvalid={isInvalid}
      error={isBoundaryError ? helpText : error}
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            min={0}
            fullWidth
            isInvalid={isInvalid}
            data-test-subj={`${dataTestSubj}MoveAfterValue`}
            disabled={isDisabled}
            value={draft.draftValue}
            inputRef={afterValueField.ref}
            onChange={(e) => draft.onChange(e.target.value)}
            onBlur={() => draft.onBlur()}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            compressed
            fullWidth
            data-test-subj={`${dataTestSubj}MoveAfterUnit`}
            disabled={isDisabled}
            options={[...timeUnitOptions]}
            value={String(afterUnitField.value)}
            onChange={(e) => {
              afterUnitField.onChange(e.target.value);
              setTimeout(() => {
                void trigger(validatePathsOnCommit);
              }, 0);
            }}
            onBlur={afterUnitField.onBlur}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
