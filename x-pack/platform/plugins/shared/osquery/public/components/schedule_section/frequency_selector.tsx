/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiCheckboxGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Weekday } from '@kbn/rrule';
import { useController } from 'react-hook-form';

import type { ScheduleFrequency } from './types';
import { DEFAULT_REPEAT_EVERY } from './types';

const FREQUENCY_OPTIONS: Array<{ id: ScheduleFrequency; label: string }> = [
  {
    id: 'minutely',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.minutely', {
      defaultMessage: 'Minutely',
    }),
  },
  {
    id: 'hourly',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.hourly', {
      defaultMessage: 'Hourly',
    }),
  },
  {
    id: 'daily',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.daily', {
      defaultMessage: 'Daily',
    }),
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.custom', {
      defaultMessage: 'Custom',
    }),
  },
  {
    id: 'monthly',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.monthly', {
      defaultMessage: 'Monthly',
    }),
  },
  {
    id: 'yearly',
    label: i18n.translate('xpack.osquery.scheduleSection.frequency.yearly', {
      defaultMessage: 'Yearly',
    }),
  },
];

const WEEKDAY_OPTIONS: Array<{ id: Weekday; label: string }> = [
  {
    id: Weekday.MO,
    label: i18n.translate('xpack.osquery.scheduleSection.day.mon', { defaultMessage: 'Mon' }),
  },
  {
    id: Weekday.TU,
    label: i18n.translate('xpack.osquery.scheduleSection.day.tue', { defaultMessage: 'Tue' }),
  },
  {
    id: Weekday.WE,
    label: i18n.translate('xpack.osquery.scheduleSection.day.wed', { defaultMessage: 'Wed' }),
  },
  {
    id: Weekday.TH,
    label: i18n.translate('xpack.osquery.scheduleSection.day.thu', { defaultMessage: 'Thu' }),
  },
  {
    id: Weekday.FR,
    label: i18n.translate('xpack.osquery.scheduleSection.day.fri', { defaultMessage: 'Fri' }),
  },
  {
    id: Weekday.SA,
    label: i18n.translate('xpack.osquery.scheduleSection.day.sat', { defaultMessage: 'Sat' }),
  },
  {
    id: Weekday.SU,
    label: i18n.translate('xpack.osquery.scheduleSection.day.sun', { defaultMessage: 'Sun' }),
  },
];

const MONTH_OPTIONS: EuiSelectOption[] = [
  {
    value: 1,
    text: i18n.translate('xpack.osquery.scheduleSection.month.jan', { defaultMessage: 'January' }),
  },
  {
    value: 2,
    text: i18n.translate('xpack.osquery.scheduleSection.month.feb', { defaultMessage: 'February' }),
  },
  {
    value: 3,
    text: i18n.translate('xpack.osquery.scheduleSection.month.mar', { defaultMessage: 'March' }),
  },
  {
    value: 4,
    text: i18n.translate('xpack.osquery.scheduleSection.month.apr', { defaultMessage: 'April' }),
  },
  {
    value: 5,
    text: i18n.translate('xpack.osquery.scheduleSection.month.may', { defaultMessage: 'May' }),
  },
  {
    value: 6,
    text: i18n.translate('xpack.osquery.scheduleSection.month.jun', { defaultMessage: 'June' }),
  },
  {
    value: 7,
    text: i18n.translate('xpack.osquery.scheduleSection.month.jul', { defaultMessage: 'July' }),
  },
  {
    value: 8,
    text: i18n.translate('xpack.osquery.scheduleSection.month.aug', { defaultMessage: 'August' }),
  },
  {
    value: 9,
    text: i18n.translate('xpack.osquery.scheduleSection.month.sep', {
      defaultMessage: 'September',
    }),
  },
  {
    value: 10,
    text: i18n.translate('xpack.osquery.scheduleSection.month.oct', { defaultMessage: 'October' }),
  },
  {
    value: 11,
    text: i18n.translate('xpack.osquery.scheduleSection.month.nov', { defaultMessage: 'November' }),
  },
  {
    value: 12,
    text: i18n.translate('xpack.osquery.scheduleSection.month.dec', { defaultMessage: 'December' }),
  },
];

const REPEAT_UNIT_LABEL: Record<ScheduleFrequency, string> = {
  minutely: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.minutes', {
    defaultMessage: 'Minute(s)',
  }),
  hourly: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.hours', {
    defaultMessage: 'Hour(s)',
  }),
  daily: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.days', {
    defaultMessage: 'Day(s)',
  }),
  custom: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.weeks', {
    defaultMessage: 'Week(s)',
  }),
  monthly: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.months', {
    defaultMessage: 'Month(s)',
  }),
  yearly: i18n.translate('xpack.osquery.scheduleSection.repeatUnit.years', {
    defaultMessage: 'Year(s)',
  }),
};

const MIN_DAY_OF_MONTH = 1;
const MAX_DAY_OF_MONTH = 31;
const MIN_REPEAT = 1;

interface FrequencySelectorProps {
  isDisabled?: boolean;
}

const FrequencySelectorComponent: React.FC<FrequencySelectorProps> = ({ isDisabled = false }) => {
  const {
    field: { value: frequency, onChange: onFrequencyChange },
  } = useController<{ frequency: ScheduleFrequency }, 'frequency'>({
    name: 'frequency',
    defaultValue: 'daily',
  });

  const {
    field: { value: repeatEvery, onChange: onRepeatEveryChange },
    fieldState: { error: repeatEveryError },
  } = useController<{ repeat_every: number }, 'repeat_every'>({
    name: 'repeat_every',
    defaultValue: DEFAULT_REPEAT_EVERY,
    rules: {
      min: {
        value: MIN_REPEAT,
        message: i18n.translate('xpack.osquery.scheduleSection.repeatEvery.minErrorMessage', {
          defaultMessage: 'Repeat must be at least 1',
        }),
      },
    },
  });

  const {
    field: { value: byweekday, onChange: onByweekdayChange },
    fieldState: { error: byweekdayError },
  } = useController<{ byweekday: Weekday[] }, 'byweekday'>({
    name: 'byweekday',
    defaultValue: [],
    rules: {
      validate: (selected: Weekday[]) =>
        frequency !== 'custom' || (selected && selected.length > 0)
          ? true
          : i18n.translate('xpack.osquery.scheduleSection.byweekday.requiredErrorMessage', {
              defaultMessage: 'Select at least one day of the week',
            }),
    },
  });

  const {
    field: { value: bymonthday, onChange: onBymonthdayChange },
    fieldState: { error: bymonthdayError },
  } = useController<{ bymonthday: number }, 'bymonthday'>({
    name: 'bymonthday',
    defaultValue: 1,
    rules: {
      min: {
        value: MIN_DAY_OF_MONTH,
        message: i18n.translate('xpack.osquery.scheduleSection.bymonthday.rangeErrorMessage', {
          defaultMessage: 'Day of month must be between 1 and 31',
        }),
      },
      max: {
        value: MAX_DAY_OF_MONTH,
        message: i18n.translate('xpack.osquery.scheduleSection.bymonthday.rangeErrorMessage', {
          defaultMessage: 'Day of month must be between 1 and 31',
        }),
      },
    },
  });

  const {
    field: { value: bymonth, onChange: onBymonthChange },
  } = useController<{ bymonth: number }, 'bymonth'>({
    name: 'bymonth',
    defaultValue: 1,
  });

  const checkboxIdToSelectedMap = useMemo(() => {
    const selectedSet = new Set(byweekday ?? []);

    return WEEKDAY_OPTIONS.reduce<Record<string, boolean>>((acc, option) => {
      acc[String(option.id)] = selectedSet.has(option.id);

      return acc;
    }, {});
  }, [byweekday]);

  const handleWeekdayToggle = useCallback(
    (id: string) => {
      const weekday = Number(id) as Weekday;
      const current = new Set(byweekday ?? []);
      if (current.has(weekday)) {
        current.delete(weekday);
      } else {
        current.add(weekday);
      }

      onByweekdayChange(Array.from(current).sort((a, b) => a - b));
    },
    [byweekday, onByweekdayChange]
  );

  const handleRepeatEveryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onRepeatEveryChange(event.target.valueAsNumber || 0);
    },
    [onRepeatEveryChange]
  );

  const handleBymonthdayChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onBymonthdayChange(event.target.valueAsNumber || 0);
    },
    [onBymonthdayChange]
  );

  const handleBymonthChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const parsed = Number(event.target.value);
      onBymonthChange(Number.isFinite(parsed) ? parsed : 1);
    },
    [onBymonthChange]
  );

  const handleFrequencyChange = useCallback(
    (id: string) => onFrequencyChange(id as ScheduleFrequency),
    [onFrequencyChange]
  );

  const showRepeatEvery = frequency !== 'daily';
  const showByweekday = frequency === 'custom';
  const showBymonthday = frequency === 'monthly' || frequency === 'yearly';
  const showBymonth = frequency === 'yearly';

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.osquery.scheduleSection.frequency.label', {
          defaultMessage: 'Frequency',
        })}
        fullWidth
      >
        <EuiRadioGroup
          name="schedule_frequency"
          options={FREQUENCY_OPTIONS}
          idSelected={frequency}
          onChange={handleFrequencyChange}
          disabled={isDisabled}
          data-test-subj="osquery-schedule-frequency"
        />
      </EuiFormRow>

      {showByweekday && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.osquery.scheduleSection.byweekday.label', {
              defaultMessage: 'Days',
            })}
            error={byweekdayError?.message}
            isInvalid={!!byweekdayError?.message}
            fullWidth
          >
            <EuiCheckboxGroup
              options={WEEKDAY_OPTIONS.map(({ id, label }) => ({
                id: String(id),
                label,
                disabled: isDisabled,
              }))}
              idToSelectedMap={checkboxIdToSelectedMap}
              onChange={handleWeekdayToggle}
              data-test-subj="osquery-schedule-byweekday"
            />
          </EuiFormRow>
        </>
      )}

      {showBymonth && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.osquery.scheduleSection.bymonth.label', {
              defaultMessage: 'Month',
            })}
            fullWidth
          >
            <EuiSelect
              options={MONTH_OPTIONS}
              value={bymonth}
              onChange={handleBymonthChange}
              disabled={isDisabled}
              data-test-subj="osquery-schedule-bymonth"
            />
          </EuiFormRow>
        </>
      )}

      {showBymonthday && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.osquery.scheduleSection.bymonthday.label', {
              defaultMessage: 'Day of month',
            })}
            error={bymonthdayError?.message}
            isInvalid={!!bymonthdayError?.message}
            fullWidth
          >
            <EuiFieldNumber
              min={MIN_DAY_OF_MONTH}
              max={MAX_DAY_OF_MONTH}
              value={bymonthday}
              onChange={handleBymonthdayChange}
              isInvalid={!!bymonthdayError?.message}
              disabled={isDisabled}
              data-test-subj="osquery-schedule-bymonthday"
              fullWidth
            />
          </EuiFormRow>
        </>
      )}

      {showRepeatEvery && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.osquery.scheduleSection.repeatEvery.label', {
              defaultMessage: 'Repeat every',
            })}
            error={repeatEveryError?.message}
            isInvalid={!!repeatEveryError?.message}
            fullWidth
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiFieldNumber
                  min={MIN_REPEAT}
                  value={repeatEvery}
                  onChange={handleRepeatEveryChange}
                  isInvalid={!!repeatEveryError?.message}
                  disabled={isDisabled}
                  append={REPEAT_UNIT_LABEL[frequency]}
                  data-test-subj="osquery-schedule-repeat-every"
                  fullWidth
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </>
      )}
    </>
  );
};

export const FrequencySelector = React.memo(FrequencySelectorComponent);
