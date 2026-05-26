/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiCheckboxGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiCheckboxGroupOption, EuiRadioGroupOption } from '@elastic/eui';
import type { WeekdayStr } from '@kbn/rrule';
import {
  AT_LEAST_ONE_DAY_ERROR,
  DAYS_OF_WEEK_LABEL,
  DAY_FR,
  DAY_MO,
  DAY_SA,
  DAY_SU,
  DAY_TH,
  DAY_TU,
  DAY_WE,
  FREQUENCY_CUSTOM,
  FREQUENCY_DAILY,
  FREQUENCY_LABEL,
  REPEAT_EVERY_LABEL,
  UNIT_WEEKS,
} from './translations';
import type { FrequencyMode, RecurrenceFormState } from './types';
import { WEEKDAY_TOKENS } from './types';

export interface FrequencySelectorProps {
  value: RecurrenceFormState;
  onChange: (next: RecurrenceFormState) => void;
  disabled?: boolean;
  /** Validation flag — surfaces the "select at least one day" error in Custom. */
  weekdaysError?: boolean;
  /**
   * Optional override for the auto-generated id prefix. In product code an
   * instance-scoped prefix from {@link useGeneratedHtmlId} is used so two
   * ScheduleSection instances on the same page (pack form + open query
   * flyout) don't share radio/checkbox ids — a duplicate id makes
   * `<label htmlFor>` activate the first matching control in the document,
   * leaking clicks across forms. Tests pin distinct prefixes to mirror that.
   */
  idPrefix?: string;
}

// Daily + Custom (weekly) only for the initial release. Re-enable the other
// frequencies by adding the corresponding entries here, the matching
// FrequencyMode tokens in `./types`, and the dead JSX branches / handlers /
// imports below. Option ids are instance-scoped (see `useGeneratedHtmlId`
// inside the component) so multiple ScheduleSection instances on the same
// page do not share radio ids — a duplicate id makes `<label htmlFor>`
// activate the wrong radio.
interface FrequencyOptionTemplate {
  suffix: string;
  label: string;
  mode: FrequencyMode;
}
const FREQUENCY_OPTION_TEMPLATES: FrequencyOptionTemplate[] = [
  { suffix: 'daily', label: FREQUENCY_DAILY, mode: 'daily' },
  { suffix: 'custom', label: FREQUENCY_CUSTOM, mode: 'custom' },
];

// MONTH_OPTIONS — unused until monthly/yearly are re-enabled.
// const MONTH_OPTIONS: EuiSelectOption[] = [
//   { value: 1, text: MONTH_JAN }, ..., { value: 12, text: MONTH_DEC },
// ];

// EUI's `EuiRadioGroup` / `EuiCheckboxGroup` apply `flex-direction: column` via
// their own emotion `css` prop, so wrapping selectors lose the specificity tie
// and the group renders vertically. Pass the override directly to the EUI
// component's `css` prop so it merges last and wins.
const HORIZONTAL_GROUP_CSS = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 16,
} as const;

const WEEKDAY_LABEL: Record<WeekdayStr, string> = {
  MO: DAY_MO,
  TU: DAY_TU,
  WE: DAY_WE,
  TH: DAY_TH,
  FR: DAY_FR,
  SA: DAY_SA,
  SU: DAY_SU,
};

const isFrequencyMode = (value: string): value is FrequencyMode =>
  FREQUENCY_OPTION_TEMPLATES.some((opt) => opt.mode === value);

const clampInt = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;

  return value;
};

export const FrequencySelector = ({
  value,
  onChange,
  disabled,
  weekdaysError,
  idPrefix,
}: FrequencySelectorProps) => {
  // Instance-scoped prefix so multiple ScheduleSection instances on the same
  // page (pack form + open query flyout) don't share radio/checkbox ids — a
  // shared `id` lets `<label htmlFor>` activate the first matching radio in
  // the document, which leaks clicks across forms.
  const generatedIdPrefix = useGeneratedHtmlId({ prefix: 'osquery-frequency-selector' });
  const basePrefix = idPrefix ?? generatedIdPrefix;
  const frequencyIdPrefix = `${basePrefix}-option`;
  const weekdayIdPrefix = `${basePrefix}-weekday`;

  const frequencyOptions = useMemo<Array<EuiRadioGroupOption & { mode: FrequencyMode }>>(
    () =>
      FREQUENCY_OPTION_TEMPLATES.map(({ suffix, label, mode }) => ({
        id: `${frequencyIdPrefix}-${suffix}`,
        label,
        mode,
      })),
    [frequencyIdPrefix]
  );

  const optionIdForMode = useCallback(
    (mode: FrequencyMode): string =>
      frequencyOptions.find((opt) => opt.mode === mode)?.id ?? frequencyOptions[0].id,
    [frequencyOptions]
  );

  const modeForOptionId = useCallback(
    (id: string): FrequencyMode | undefined => frequencyOptions.find((opt) => opt.id === id)?.mode,
    [frequencyOptions]
  );

  const handleFrequencyChange = useCallback(
    (optionId: string) => {
      const next = modeForOptionId(optionId);
      if (!next || !isFrequencyMode(next) || next === value.frequency) return;

      // D22: changing the frequency SHALL clear `_unknown` parts so the new
      // RRULE shape is not silently contaminated by parts that only made
      // sense under the previous frequency.
      onChange({
        ...value,
        frequency: next,
        _unknown: undefined,
      });
    },
    [modeForOptionId, onChange, value]
  );

  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      const next = clampInt(raw, 1, 9999, value.interval);
      onChange({ ...value, interval: next });
    },
    [onChange, value]
  );

  const tokenForWeekdayId = useCallback(
    (id: string): WeekdayStr | undefined => {
      const suffix = id.startsWith(`${weekdayIdPrefix}-`)
        ? id.slice(weekdayIdPrefix.length + 1)
        : id;

      return (WEEKDAY_TOKENS as readonly string[]).includes(suffix)
        ? (suffix as WeekdayStr)
        : undefined;
    },
    [weekdayIdPrefix]
  );

  const handleWeekdayToggle = useCallback(
    (id: string) => {
      const token = tokenForWeekdayId(id);
      if (!token) return;
      const selected = new Set(value.byweekday);
      if (selected.has(token)) {
        selected.delete(token);
      } else {
        selected.add(token);
      }

      const ordered = WEEKDAY_TOKENS.filter((day) => selected.has(day));
      onChange({ ...value, byweekday: ordered });
    },
    [onChange, tokenForWeekdayId, value]
  );

  // Monthly/yearly handlers — unused until those modes are re-enabled.
  // const handleMonthDayChange = useCallback(
  //   (event: React.ChangeEvent<HTMLInputElement>) => {
  //     const raw = Number(event.target.value);
  //     const next = clampInt(raw, 1, 31, value.bymonthday);
  //     onChange({ ...value, bymonthday: next });
  //   },
  //   [onChange, value]
  // );
  //
  // const handleMonthChange = useCallback(
  //   (event: React.ChangeEvent<HTMLSelectElement>) => {
  //     const raw = Number(event.target.value);
  //     const next = clampInt(raw, 1, 12, value.bymonth);
  //     onChange({ ...value, bymonth: next });
  //   },
  //   [onChange, value]
  // );

  const weekdayOptions = useMemo<EuiCheckboxGroupOption[]>(
    () =>
      WEEKDAY_TOKENS.map((token) => ({
        id: `${weekdayIdPrefix}-${token}`,
        label: WEEKDAY_LABEL[token],
        disabled,
      })),
    [disabled, weekdayIdPrefix]
  );

  const weekdayIdToSelectedMap = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const token of WEEKDAY_TOKENS) {
      map[`${weekdayIdPrefix}-${token}`] = value.byweekday.includes(token);
    }

    return map;
  }, [value.byweekday, weekdayIdPrefix]);

  const everyUnitLabel: string | null = (() => {
    switch (value.frequency) {
      // Minutely/hourly cases — unused until those modes are re-enabled.
      // case 'minutely':
      //   return UNIT_MINUTES;
      // case 'hourly':
      //   return UNIT_HOURS;
      case 'custom':
        return UNIT_WEEKS;
      default:
        return null;
    }
  })();

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="osquery-frequency-selector">
      <EuiFlexItem>
        <EuiFormRow label={FREQUENCY_LABEL} fullWidth>
          <EuiRadioGroup
            css={HORIZONTAL_GROUP_CSS}
            options={frequencyOptions.map(({ id, label, mode }) => ({
              id,
              label,
              disabled: disabled || mode === undefined,
            }))}
            idSelected={optionIdForMode(value.frequency)}
            onChange={handleFrequencyChange}
            data-test-subj="osquery-frequency-selector-mode"
          />
        </EuiFormRow>
      </EuiFlexItem>

      {value.frequency === 'custom' ? (
        <EuiFlexItem>
          <EuiPanel color="subdued" hasShadow={false} hasBorder={false} paddingSize="m">
            <EuiFormRow
              label={DAYS_OF_WEEK_LABEL}
              isInvalid={!!weekdaysError}
              error={weekdaysError ? AT_LEAST_ONE_DAY_ERROR : undefined}
              fullWidth
            >
              <EuiCheckboxGroup
                css={HORIZONTAL_GROUP_CSS}
                options={weekdayOptions}
                idToSelectedMap={weekdayIdToSelectedMap}
                onChange={handleWeekdayToggle}
                data-test-subj="osquery-frequency-selector-weekdays"
              />
            </EuiFormRow>
            {everyUnitLabel ? (
              <EuiFormRow label={REPEAT_EVERY_LABEL} fullWidth>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  step={1}
                  value={value.interval}
                  onChange={handleIntervalChange}
                  disabled={disabled}
                  append={everyUnitLabel}
                  data-test-subj="osquery-frequency-selector-every"
                />
              </EuiFormRow>
            ) : null}
          </EuiPanel>
        </EuiFlexItem>
      ) : null}

      {/* Yearly month selector — unused until 'yearly' mode is re-enabled.
      {value.frequency === 'yearly' ? (
        <EuiFlexItem>
          <EuiFormRow label={MONTH_LABEL} fullWidth>
            <EuiSelect
              options={MONTH_OPTIONS}
              value={value.bymonth}
              onChange={handleMonthChange}
              disabled={disabled}
              data-test-subj="osquery-frequency-selector-month"
            />
          </EuiFormRow>
        </EuiFlexItem>
      ) : null}

      Monthly/yearly day-of-month selector — unused until those modes are re-enabled.
      {value.frequency === 'monthly' || value.frequency === 'yearly' ? (
        <EuiFlexItem>
          <EuiFormRow label={DAY_OF_MONTH_LABEL} fullWidth>
            <EuiFieldNumber
              min={1}
              max={31}
              step={1}
              value={value.bymonthday}
              onChange={handleMonthDayChange}
              disabled={disabled}
              data-test-subj="osquery-frequency-selector-month-day"
            />
          </EuiFormRow>
        </EuiFlexItem>
      ) : null} */}
    </EuiFlexGroup>
  );
};
