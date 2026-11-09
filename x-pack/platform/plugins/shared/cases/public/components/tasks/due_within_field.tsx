/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { DueWithinUnit } from '../../../common/types/domain/task_template/v1';
import * as i18n from './translations';

export interface DueWithinDraft {
  /** Raw input so a cleared field stays empty instead of snapping to 0. */
  value: string;
  unit: DueWithinUnit;
}

const UNIT_OPTIONS: Array<{ value: DueWithinUnit; text: string }> = [
  { value: 'minutes', text: i18n.UNIT_MINUTES },
  { value: 'hours', text: i18n.UNIT_HOURS },
  { value: 'days', text: i18n.UNIT_DAYS },
];

const MS_PER_UNIT: Record<DueWithinUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

/** Resolves a relative deadline against now; empty or non-positive input means no deadline. */
export const dueDateFromDraft = (
  { value, unit }: DueWithinDraft,
  now = new Date()
): string | null =>
  value.trim() === '' || Number(value) <= 0
    ? null
    : new Date(now.getTime() + Number(value) * MS_PER_UNIT[unit]).toISOString();

interface DueWithinFieldProps {
  value: DueWithinDraft;
  onChange: (value: DueWithinDraft) => void;
  helpText?: string;
  fullWidth?: boolean;
  dataTestSubj: string;
}

export const DueWithinField: React.FC<DueWithinFieldProps> = ({
  value,
  onChange,
  helpText,
  fullWidth,
  dataTestSubj,
}) => (
  <EuiFormRow
    label={i18n.DUE_WITHIN}
    helpText={helpText}
    display={fullWidth ? undefined : 'rowCompressed'}
    fullWidth={fullWidth}
  >
    <EuiFieldNumber
      compressed={!fullWidth}
      fullWidth={fullWidth}
      min={1}
      step={1}
      value={value.value}
      onChange={(event) => onChange({ ...value, value: event.target.value })}
      aria-label={i18n.DUE_WITHIN}
      css={fullWidth ? undefined : { width: 90 }}
      append={
        <EuiSelect
          compressed={!fullWidth}
          options={UNIT_OPTIONS}
          value={value.unit}
          onChange={(event) => onChange({ ...value, unit: event.target.value as DueWithinUnit })}
          aria-label={i18n.DUE_WITHIN}
          data-test-subj={`${dataTestSubj}-unit`}
        />
      }
      data-test-subj={`${dataTestSubj}-value`}
    />
  </EuiFormRow>
);

DueWithinField.displayName = 'DueWithinField';
