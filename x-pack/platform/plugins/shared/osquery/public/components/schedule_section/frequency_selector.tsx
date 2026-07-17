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
  EuiSelect,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiCheckboxGroupOption, EuiRadioGroupOption, EuiSelectOption } from '@elastic/eui';
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
  REPEAT_UNIT_LABEL,
  UNIT_MONTHS,
  UNIT_WEEKS,
  UNIT_YEARS,
} from './translations';
import type { FrequencyMode, RecurrenceFormState, RepeatUnit } from './types';
import { clampInt, maxIntervalForUnit, WEEKDAY_TOKENS } from './types';
import { selectAppendCss } from './select_append_css';

export interface FrequencySelectorProps {
  value: RecurrenceFormState;
  onChange: (next: RecurrenceFormState) => void;
  disabled?: boolean;
  /** Validation flag — surfaces the "select at least one day" error in Custom. */
  weekdaysError?: boolean;
  /** Test-only override; product code uses an instance-scoped `useGeneratedHtmlId` (see below). */
  idPrefix?: string;
}

interface FrequencyOptionTemplate {
  suffix: string;
  label: string;
  mode: FrequencyMode;
}

const FREQUENCY_OPTION_TEMPLATES: FrequencyOptionTemplate[] = [
  { suffix: 'daily', label: FREQUENCY_DAILY, mode: 'daily' },
  { suffix: 'custom', label: FREQUENCY_CUSTOM, mode: 'custom' },
];

// `EuiSelect` values are strings on the DOM regardless of the option's
// declared type — using string values here avoids a round-trip cast at
// `onChange` time.
const REPEAT_UNIT_OPTIONS: EuiSelectOption[] = [
  { value: 'weeks', text: UNIT_WEEKS },
  { value: 'months', text: UNIT_MONTHS },
  { value: 'years', text: UNIT_YEARS },
];

const isRepeatUnit = (value: string): value is RepeatUnit =>
  value === 'weeks' || value === 'months' || value === 'years';

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

export const FrequencySelector = ({
  value,
  onChange,
  disabled,
  weekdaysError,
  idPrefix,
}: FrequencySelectorProps) => {
  // Instance-scoped so a pack form + open query flyout on the same page don't
  // share radio/checkbox ids (a shared id makes `<label htmlFor>` toggle the wrong one).
  const generatedIdPrefix = useGeneratedHtmlId({ prefix: 'osquery-frequency-selector' });
  const basePrefix = idPrefix ?? generatedIdPrefix;
  const frequencyIdPrefix = `${basePrefix}-option`;
  const weekdayIdPrefix = `${basePrefix}-weekday`;

  // `EuiRadioGroup` / `EuiCheckboxGroup` hard-code `flex-direction: column` and
  // expose no horizontal prop, so overriding their flex via the `css` prop is
  // the only supported way to lay the options out in a row.
  const { euiTheme } = useEuiTheme();
  const horizontalGroupCss = useMemo(
    () => ({ flexDirection: 'row', flexWrap: 'wrap', gap: euiTheme.size.base } as const),
    [euiTheme.size.base]
  );
  const repeatUnitAppendCss = useMemo(
    () => selectAppendCss(euiTheme.border.radius.medium ?? 0),
    [euiTheme.border.radius.medium]
  );

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

      // Changing the frequency SHALL clear `_unknown` parts so the new
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

  const repeatUnit: RepeatUnit = value.repeatUnit ?? 'weeks';

  const handleRepeatUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const raw = event.target.value;
      if (!isRepeatUnit(raw) || raw === repeatUnit) return;

      // Switching units changes the effective RRULE shape (WEEKLY+BYDAY vs.
      // MONTHLY vs. YEARLY) even though `frequency` itself stays `'custom'` —
      // clear `_unknown` for the same reason a frequency change does (D39).
      // Re-bound the interval to the new unit's max so a large Month(s)
      // value can't leak into Year(s).
      const nextInterval = clampInt(value.interval, 1, maxIntervalForUnit(raw), value.interval);
      onChange({ ...value, repeatUnit: raw, interval: nextInterval, _unknown: undefined });
    },
    [onChange, repeatUnit, value]
  );

  const intervalMax = maxIntervalForUnit(repeatUnit);

  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      const next = clampInt(raw, 1, intervalMax, value.interval);
      onChange({ ...value, interval: next });
    },
    [intervalMax, onChange, value]
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

  const showFrequencyPanel = value.frequency === 'custom';
  const showWeekdays = showFrequencyPanel && repeatUnit === 'weeks';

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="osquery-frequency-selector">
      <EuiFlexItem>
        <EuiFormRow label={FREQUENCY_LABEL} fullWidth>
          <EuiRadioGroup
            css={horizontalGroupCss}
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

      {showFrequencyPanel ? (
        <EuiFlexItem>
          <EuiPanel color="subdued" hasShadow={false} hasBorder={false} paddingSize="m">
            {showWeekdays ? (
              <EuiFormRow
                label={DAYS_OF_WEEK_LABEL}
                isInvalid={!!weekdaysError}
                error={weekdaysError ? AT_LEAST_ONE_DAY_ERROR : undefined}
                fullWidth
              >
                <EuiCheckboxGroup
                  css={horizontalGroupCss}
                  options={weekdayOptions}
                  idToSelectedMap={weekdayIdToSelectedMap}
                  onChange={handleWeekdayToggle}
                  data-test-subj="osquery-frequency-selector-weekdays"
                />
              </EuiFormRow>
            ) : null}

            <EuiFormRow label={REPEAT_EVERY_LABEL} fullWidth css={repeatUnitAppendCss}>
              <EuiFieldNumber
                fullWidth
                min={1}
                max={intervalMax}
                step={1}
                value={value.interval}
                onChange={handleIntervalChange}
                disabled={disabled}
                append={
                  <EuiSelect
                    options={REPEAT_UNIT_OPTIONS}
                    value={repeatUnit}
                    onChange={handleRepeatUnitChange}
                    disabled={disabled}
                    aria-label={REPEAT_UNIT_LABEL}
                    data-test-subj="osquery-frequency-selector-unit"
                  />
                }
                data-test-subj="osquery-frequency-selector-every"
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
