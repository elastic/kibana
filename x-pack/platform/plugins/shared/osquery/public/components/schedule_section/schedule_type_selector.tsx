/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import type { EuiRadioGroupOption } from '@elastic/eui';
import type { ScheduleType } from '../../../common/schedule';
import {
  SCHEDULE_TYPE_INTERVAL_LABEL,
  SCHEDULE_TYPE_LABEL,
  SCHEDULE_TYPE_LOCKED_HELP,
  SCHEDULE_TYPE_RECURRENCE_LABEL,
} from './translations';

export interface ScheduleTypeSelectorProps {
  value: ScheduleType;
  onChange: (value: ScheduleType) => void;
  /**
   * When set, the selector locks to the given mode. Used by the QueryFlyout
   * to enforce the same-mode constraint (D11) — per-query overrides cannot
   * change the pack's schedule mode, only its details.
   */
  lockedScheduleType?: ScheduleType;
  disabled?: boolean;
  idPrefix?: string;
}

const SCHEDULE_TYPE_VALUES: ScheduleType[] = ['interval', 'rrule'];

export const ScheduleTypeSelector = ({
  value,
  onChange,
  lockedScheduleType,
  disabled,
  idPrefix = 'osquery-schedule-type',
}: ScheduleTypeSelectorProps) => {
  const isLocked = lockedScheduleType !== undefined;
  const effectiveValue = isLocked ? lockedScheduleType : value;

  const options = useMemo<EuiRadioGroupOption[]>(
    () => [
      {
        id: `${idPrefix}-interval`,
        label: SCHEDULE_TYPE_INTERVAL_LABEL,
        disabled: disabled || isLocked,
      },
      {
        id: `${idPrefix}-rrule`,
        label: SCHEDULE_TYPE_RECURRENCE_LABEL,
        disabled: disabled || isLocked,
      },
    ],
    [disabled, idPrefix, isLocked]
  );

  const selectedId = `${idPrefix}-${effectiveValue}`;

  const handleChange = useCallback(
    (id: string) => {
      if (isLocked) return;

      const next = SCHEDULE_TYPE_VALUES.find((token) => id === `${idPrefix}-${token}`);
      if (next && next !== value) {
        onChange(next);
      }
    },
    [idPrefix, isLocked, onChange, value]
  );

  return (
    <EuiFormRow
      label={SCHEDULE_TYPE_LABEL}
      helpText={isLocked ? SCHEDULE_TYPE_LOCKED_HELP : undefined}
      fullWidth
    >
      <EuiRadioGroup
        options={options}
        idSelected={selectedId}
        onChange={handleChange}
        data-test-subj="osquery-schedule-type-selector"
      />
    </EuiFormRow>
  );
};
