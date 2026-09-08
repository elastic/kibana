/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { FrequencySelector } from '../frequency_selector';
import {
  AT_LEAST_ONE_DAY_ERROR,
  FREQUENCY_CUSTOM,
  FREQUENCY_DAILY,
  FREQUENCY_HOURLY,
  FREQUENCY_MINUTELY,
  FREQUENCY_MONTHLY,
  FREQUENCY_YEARLY,
} from '../translations';
import { createDefaultRecurrence } from '../types';
import type { RecurrenceFormState } from '../types';
import { renderWithProviders } from './test_helpers';

const baseRecurrence = (): RecurrenceFormState => createDefaultRecurrence();

describe('FrequencySelector', () => {
  describe('rendering — supported frequency set', () => {
    it('renders the Daily and Custom options', () => {
      renderWithProviders(<FrequencySelector value={baseRecurrence()} onChange={jest.fn()} />);

      expect(screen.getByLabelText(FREQUENCY_DAILY)).toBeInTheDocument();
      expect(screen.getByLabelText(FREQUENCY_CUSTOM)).toBeInTheDocument();
    });

    it('does not render Minutely, Hourly, Monthly, or Yearly as separate frequency options', () => {
      // Monthly/Yearly are units of Custom's "Repeat every" selector, not
      // separate top-level frequency options (D39, supersedes D38).
      renderWithProviders(<FrequencySelector value={baseRecurrence()} onChange={jest.fn()} />);

      expect(screen.queryByLabelText(FREQUENCY_MINUTELY)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(FREQUENCY_HOURLY)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(FREQUENCY_MONTHLY)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(FREQUENCY_YEARLY)).not.toBeInTheDocument();
    });
  });

  describe('Daily mode', () => {
    it('marks Daily as selected when frequency is "daily"', () => {
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'daily' }}
          onChange={jest.fn()}
        />
      );

      const daily = screen.getByLabelText(FREQUENCY_DAILY) as HTMLInputElement;
      expect(daily.checked).toBe(true);
    });

    it('does not render the weekday checkboxes or repeat-every field when in Daily mode', () => {
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'daily' }}
          onChange={jest.fn()}
        />
      );

      expect(screen.queryByTestId('osquery-frequency-selector-weekdays')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-frequency-selector-every')).not.toBeInTheDocument();
    });
  });

  describe('Custom mode — Week(s) unit (default)', () => {
    it('renders the weekday checkbox group, INTERVAL input, and unit selector', () => {
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom' }}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('osquery-frequency-selector-weekdays')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-frequency-selector-every')).toBeInTheDocument();
      expect(
        (screen.getByTestId('osquery-frequency-selector-unit') as HTMLSelectElement).value
      ).toBe('weeks');
    });

    it('reflects the selected weekdays in the checkbox state', () => {
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            byweekday: ['MO', 'WE'],
          }}
          onChange={jest.fn()}
        />
      );

      expect((screen.getByLabelText('Mon') as HTMLInputElement).checked).toBe(true);
      expect((screen.getByLabelText('Wed') as HTMLInputElement).checked).toBe(true);
      expect((screen.getByLabelText('Tue') as HTMLInputElement).checked).toBe(false);
    });

    it('shows the AT_LEAST_ONE_DAY_ERROR when weekdaysError is true', () => {
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            byweekday: [],
          }}
          onChange={jest.fn()}
          weekdaysError
        />
      );

      expect(screen.getByText(AT_LEAST_ONE_DAY_ERROR)).toBeInTheDocument();
    });

    it('treats an undefined repeatUnit as "weeks" (backward compatibility)', () => {
      const { repeatUnit, ...rest } = baseRecurrence();
      renderWithProviders(
        <FrequencySelector value={{ ...rest, frequency: 'custom' }} onChange={jest.fn()} />
      );

      expect(screen.getByTestId('osquery-frequency-selector-weekdays')).toBeInTheDocument();
      expect(
        (screen.getByTestId('osquery-frequency-selector-unit') as HTMLSelectElement).value
      ).toBe('weeks');
    });
  });

  describe('Custom mode — Month(s)/Year(s) units', () => {
    it('hides the weekday checkboxes when the unit is Month(s)', () => {
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'months' }}
          onChange={jest.fn()}
        />
      );

      expect(screen.queryByTestId('osquery-frequency-selector-weekdays')).not.toBeInTheDocument();
      expect(screen.getByTestId('osquery-frequency-selector-every')).toBeInTheDocument();
      expect(
        (screen.getByTestId('osquery-frequency-selector-unit') as HTMLSelectElement).value
      ).toBe('months');
    });

    it('hides the weekday checkboxes when the unit is Year(s)', () => {
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'years' }}
          onChange={jest.fn()}
        />
      );

      expect(screen.queryByTestId('osquery-frequency-selector-weekdays')).not.toBeInTheDocument();
      expect(
        (screen.getByTestId('osquery-frequency-selector-unit') as HTMLSelectElement).value
      ).toBe('years');
    });

    it('switches the unit to Month(s) and clears `_unknown`', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            _unknown: { BYMONTHDAY: '1,15' },
          }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-unit'), {
        target: { value: 'months' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.repeatUnit).toBe('months');
      expect(next._unknown).toBeUndefined();
    });

    it('switches the unit to Year(s)', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-unit'), {
        target: { value: 'years' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.repeatUnit).toBe('years');
    });

    it('does not fire onChange when re-selecting the current unit', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'weeks' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-unit'), {
        target: { value: 'weeks' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('preserves byweekday selection when switching from weeks to months and back', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', byweekday: ['MO', 'WE'] }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-unit'), {
        target: { value: 'months' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.byweekday).toEqual(['MO', 'WE']);
    });

    it('clamps the repeat-every input to the unit-specific maximum, not a shared 9999', () => {
      // Month(s) caps at 1200 (100 years) — well under the ~292.5-year
      // rrule-go horizon. A unit-blind 9999 cap would let an interval
      // through whose second MONTHLY occurrence never fires.
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'months' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '99999' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(1200);
    });

    it('clamps a Year(s) interval above 100 to 100', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'years' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '293' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(100);
    });

    it('clamps a Month(s) interval above 1200 to 1200', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'months' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '3508' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(1200);
    });

    it('still allows a Week(s) interval up to 9999', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'weeks' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '9999' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(9999);
    });

    it('re-bounds an over-cap Month(s) interval when switching to Year(s)', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            repeatUnit: 'months',
            interval: 1200,
          }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-unit'), {
        target: { value: 'years' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.repeatUnit).toBe('years');
      expect(next.interval).toBe(100);
    });

    it('keeps `repeatUnit` sticky across a Daily round trip (frequency change does not reset it)', () => {
      const onChange = jest.fn();
      const { rerender } = renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom', repeatUnit: 'months' }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText(FREQUENCY_DAILY));
      const afterDaily = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(afterDaily.frequency).toBe('daily');
      expect(afterDaily.repeatUnit).toBe('months');

      rerender(<FrequencySelector value={afterDaily} onChange={onChange} />);
      fireEvent.click(screen.getByLabelText(FREQUENCY_CUSTOM));
      const afterCustom = onChange.mock.calls[1][0] as RecurrenceFormState;

      expect(afterCustom.repeatUnit).toBe('months');
    });
  });

  describe('change handling', () => {
    it('switches frequency and clears `_unknown` on the change', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'daily',
            _unknown: { BYHOUR: '9' },
          }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText(FREQUENCY_CUSTOM));

      expect(onChange).toHaveBeenCalledTimes(1);
      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.frequency).toBe('custom');
      // A frequency change must clear `_unknown` so the new RRULE shape
      // isn't contaminated by parts that only made sense under the prior mode.
      expect(next._unknown).toBeUndefined();
    });

    it('does not fire onChange when the user re-selects the current frequency', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'daily' }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText(FREQUENCY_DAILY));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('appends a newly selected weekday in canonical order (MO..SU)', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            byweekday: ['WE'],
          }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Mon'));
      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      // Canonical week order means Monday lands before Wednesday regardless of
      // the order the user clicked the boxes.
      expect(next.byweekday).toEqual(['MO', 'WE']);
    });

    it('removes a previously selected weekday on toggle off', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{
            ...baseRecurrence(),
            frequency: 'custom',
            byweekday: ['MO', 'TU'],
          }}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Mon'));
      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.byweekday).toEqual(['TU']);
    });

    it('clamps the INTERVAL input below the minimum (1)', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '0' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(1);
    });

    it('clamps the INTERVAL input above the maximum (9999)', () => {
      const onChange = jest.fn();
      renderWithProviders(
        <FrequencySelector
          value={{ ...baseRecurrence(), frequency: 'custom' }}
          onChange={onChange}
        />
      );

      fireEvent.change(screen.getByTestId('osquery-frequency-selector-every'), {
        target: { value: '99999' },
      });

      const next = onChange.mock.calls[0][0] as RecurrenceFormState;
      expect(next.interval).toBe(9999);
    });
  });

  describe('instance-scoped radio ids (cross-instance click leak guard)', () => {
    // Two ScheduleSection instances can coexist on screen — the pack form and
    // an open query flyout. With shared static option ids, clicking a `<label
    // htmlFor>` would activate the first matching radio in document order,
    // making a click in the flyout flip the pack's frequency. In product code
    // each instance gets a unique prefix via `useGeneratedHtmlId`; the tests
    // pin distinct prefixes to mirror that because EUI's test-env stub
    // returns a static id.
    it('routes frequency-label clicks only to the instance whose label was clicked', () => {
      const firstOnChange = jest.fn();
      const secondOnChange = jest.fn();
      renderWithProviders(
        <>
          <FrequencySelector
            value={{ ...baseRecurrence(), frequency: 'daily' }}
            onChange={firstOnChange}
            idPrefix="freq-selector-first"
          />
          <FrequencySelector
            value={{ ...baseRecurrence(), frequency: 'daily' }}
            onChange={secondOnChange}
            idPrefix="freq-selector-second"
          />
        </>
      );

      const customLabels = screen.getAllByText(FREQUENCY_CUSTOM);
      expect(customLabels).toHaveLength(2);
      fireEvent.click(customLabels[1]);

      expect(secondOnChange).toHaveBeenCalledTimes(1);
      expect(firstOnChange).not.toHaveBeenCalled();
    });

    it('routes weekday-label clicks only to the instance whose label was clicked', () => {
      const firstOnChange = jest.fn();
      const secondOnChange = jest.fn();
      renderWithProviders(
        <>
          <FrequencySelector
            value={{ ...baseRecurrence(), frequency: 'custom' }}
            onChange={firstOnChange}
            idPrefix="freq-selector-first"
          />
          <FrequencySelector
            value={{ ...baseRecurrence(), frequency: 'custom' }}
            onChange={secondOnChange}
            idPrefix="freq-selector-second"
          />
        </>
      );

      const mondayLabels = screen.getAllByText('Mon');
      expect(mondayLabels).toHaveLength(2);
      fireEvent.click(mondayLabels[1]);

      expect(secondOnChange).toHaveBeenCalledTimes(1);
      expect(firstOnChange).not.toHaveBeenCalled();
    });
  });
});
