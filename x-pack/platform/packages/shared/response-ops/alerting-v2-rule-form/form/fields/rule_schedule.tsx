/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexItem, EuiFormRow, EuiFlexGroup, EuiSelect, EuiFieldNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getDurationUnitValue,
  getDurationNumberInItsUnit,
  getTimeOptions,
  INVALID_NUMBER_KEYS,
  parsePositiveIntegerInput,
} from '../utils';

const SCHEDULE_TITLE_PREFIX = i18n.translate('xpack.alertingV2.ruleForm.schedule.titlePrefix', {
  defaultMessage: 'Every',
});

const SCHEDULE_UNIT_LABEL = i18n.translate('xpack.alertingV2.ruleForm.schedule.unitLabel', {
  defaultMessage: 'Unit',
});

interface Props {
  value: string;
  onChange: (value: string) => void;
  errors?: string;
}

export const RuleSchedule: React.FC<Props> = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, errors }, ref) => {
    const intervalNumber = useMemo(() => {
      return getDurationNumberInItsUnit(value ?? 1);
    }, [value]);

    const intervalUnit = useMemo(() => {
      return getDurationUnitValue(value);
    }, [value]);

    const onIntervalNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parsePositiveIntegerInput(e.target.value);
        if (parsedValue != null) {
          onChange(`${parsedValue}${intervalUnit}`);
        }
      },
      [intervalUnit, onChange]
    );

    const onIntervalUnitChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(`${intervalNumber}${e.target.value}`);
      },
      [intervalNumber, onChange]
    );

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (INVALID_NUMBER_KEYS.includes(e.key)) {
        e.preventDefault();
      }
    }, []);

    return (
      <EuiFormRow
        fullWidth
        data-test-subj="ruleSchedule"
        display="rowCompressed"
        isInvalid={!!errors}
        error={errors}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              fullWidth
              compressed={true}
              prepend={[SCHEDULE_TITLE_PREFIX]}
              isInvalid={!!errors}
              value={intervalNumber}
              name="interval"
              data-test-subj="ruleScheduleNumberInput"
              onChange={onIntervalNumberChange}
              onKeyDown={onKeyDown}
              id="ruleScheduleNumberInput"
              itemID="ruleScheduleNumberInput"
              aria-label={SCHEDULE_TITLE_PREFIX}
              inputRef={ref}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              fullWidth
              compressed={true}
              value={intervalUnit}
              options={getTimeOptions(intervalNumber ?? 1)}
              onChange={onIntervalUnitChange}
              data-test-subj="ruleScheduleUnitInput"
              aria-label={SCHEDULE_UNIT_LABEL}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
