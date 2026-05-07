/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import type { Moment } from 'moment-timezone';
import { useController, useWatch } from 'react-hook-form';

interface StopAfterFieldProps {
  isDisabled?: boolean;
}

const StopAfterFieldComponent: React.FC<StopAfterFieldProps> = ({ isDisabled = false }) => {
  const startDate = useWatch<{ start_date: string }, 'start_date'>({ name: 'start_date' });

  const {
    field: { value: enabled, onChange: onEnabledChange },
  } = useController<{ end_date_enabled: boolean }, 'end_date_enabled'>({
    name: 'end_date_enabled',
    defaultValue: false,
  });

  const {
    field: { value: endDate, onChange: onEndDateChange },
    fieldState: { error: endDateError },
  } = useController<{ end_date: string }, 'end_date'>({
    name: 'end_date',
    defaultValue: '',
    rules: {
      validate: (value) => {
        if (!enabled) {
          return true;
        }

        if (!value) {
          return i18n.translate('xpack.osquery.scheduleSection.endDate.requiredErrorMessage', {
            defaultMessage: 'End date is required when "Stop after" is on',
          });
        }

        if (startDate && moment(value).isSameOrBefore(moment(startDate))) {
          return i18n.translate('xpack.osquery.scheduleSection.endDate.afterStartErrorMessage', {
            defaultMessage: 'End date must be after the start date',
          });
        }

        return true;
      },
    },
  });

  const selected = useMemo<Moment | null>(() => {
    if (!endDate) {
      return null;
    }

    const parsed = moment(endDate);

    return parsed.isValid() ? parsed : null;
  }, [endDate]);

  const handleToggle = useCallback(
    (event: EuiSwitchEvent) => {
      const next = event.target.checked;
      onEnabledChange(next);
      if (!next) {
        onEndDateChange('');
      }
    },
    [onEnabledChange, onEndDateChange]
  );

  const handleEndDateChange = useCallback(
    (next: Moment | null) => {
      onEndDateChange(next ? next.toISOString() : '');
    },
    [onEndDateChange]
  );

  const minDate = useMemo<Moment | undefined>(() => {
    if (!startDate) {
      return undefined;
    }

    const parsed = moment(startDate);

    return parsed.isValid() ? parsed : undefined;
  }, [startDate]);

  const hasError = enabled && !!endDateError?.message;

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.osquery.scheduleSection.stopAfter.label', {
                  defaultMessage: 'Stop after',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.osquery.scheduleSection.stopAfter.toggleLabel', {
                defaultMessage: 'Stop after',
              })}
              showLabel={false}
              checked={enabled}
              onChange={handleToggle}
              disabled={isDisabled}
              compressed
              data-test-subj="osquery-schedule-stop-after-toggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.osquery.scheduleSection.stopAfter.description', {
            defaultMessage: 'Set an end date for this schedule.',
          })}
        </EuiText>
      }
      error={hasError ? endDateError?.message : undefined}
      isInvalid={hasError}
      fullWidth
    >
      <>
        <EuiSpacer size="s" />
        <EuiDatePicker
          showTimeSelect
          selected={selected}
          minDate={minDate}
          onChange={handleEndDateChange}
          disabled={isDisabled || !enabled}
          isInvalid={hasError}
          fullWidth
          data-test-subj="osquery-schedule-stop-after-date"
        />
      </>
    </EuiFormRow>
  );
};

export const StopAfterField = React.memo(StopAfterFieldComponent);
