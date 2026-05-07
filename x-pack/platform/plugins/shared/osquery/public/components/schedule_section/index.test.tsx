/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';
import { Weekday } from '@kbn/rrule';

import { ScheduleSection, DEFAULT_SCHEDULE_FORM_VALUES } from '.';
import type { ScheduleFormData } from './types';

const minimalTheme = {
  euiTheme: {
    colors: { primary: '#006BB4', success: '#00BFB3', subduedText: '#69707d' },
    border: { width: { thin: '1px' } },
    size: { base: '16px' },
  } as unknown as EuiThemeComputed<{}>,
};

interface FormHandle {
  trigger: () => Promise<boolean>;
  getValues: () => ScheduleFormData;
  setValue: (name: keyof ScheduleFormData, value: unknown) => void;
}

const formHandleRef: { current: FormHandle | null } = { current: null };

const FormWrapper: React.FC<{
  defaultValues?: Partial<ScheduleFormData>;
  children: React.ReactNode;
}> = ({ defaultValues, children }) => {
  const methods = useForm<ScheduleFormData>({
    defaultValues: { ...DEFAULT_SCHEDULE_FORM_VALUES, ...defaultValues },
  });
  formHandleRef.current = {
    trigger: () => methods.trigger(),
    getValues: () => methods.getValues(),
    setValue: (name, value) => methods.setValue(name, value as never, { shouldDirty: true }),
  };

  return (
    <EuiProvider>
      <ThemeProvider theme={minimalTheme}>
        <IntlProvider locale="en">
          <FormProvider {...methods}>{children}</FormProvider>
        </IntlProvider>
      </ThemeProvider>
    </EuiProvider>
  );
};

const renderSection = (defaultValues?: Partial<ScheduleFormData>) =>
  render(
    <FormWrapper defaultValues={defaultValues}>
      <ScheduleSection />
    </FormWrapper>
  );

/**
 * Switch the section into rrule mode and apply per-test field overrides.
 *
 * `useWatch` inside ScheduleSection ships a `defaultValue: 'interval'`, which
 * overrides the form's initial `defaultValues` on the very first render before
 * the watcher subscription is active. Driving the toggle from the rendered UI
 * (or via `setValue`) is the reliable way to put the form into rrule mode for
 * tests, mirroring how a real user would interact with the section.
 */
const enterRruleMode = async (overrides: Partial<ScheduleFormData> = {}) => {
  const handle = formHandleRef.current!;
  await act(async () => {
    handle.setValue('schedule_type', 'rrule');
    for (const [key, value] of Object.entries(overrides)) {
      handle.setValue(key as keyof ScheduleFormData, value);
    }
  });
};

describe('ScheduleSection', () => {
  beforeEach(() => {
    formHandleRef.current = null;
  });

  describe('schedule type toggle', () => {
    it('renders the interval field by default', () => {
      renderSection();
      expect(screen.getByTestId('osquery-schedule-section')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-interval-field')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-frequency')).not.toBeInTheDocument();
    });

    it('switches to recurrence mode when the rrule card is clicked', async () => {
      const user = userEvent.setup();
      renderSection();

      await user.click(screen.getByTestId('osquery-schedule-type-rrule'));

      expect(screen.queryByTestId('osquery-interval-field')).not.toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-frequency')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-stop-after-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-splay-toggle')).toBeInTheDocument();
    });
  });

  describe('frequency conditional rendering', () => {
    it('shows only the frequency selector for daily (no repeat-every input)', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'daily' });

      expect(screen.getByTestId('osquery-schedule-frequency')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-repeat-every')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-byweekday')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-bymonth')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-bymonthday')).not.toBeInTheDocument();
    });

    it('shows the repeat-every input for hourly', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'hourly' });

      expect(screen.getByTestId('osquery-schedule-repeat-every')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-byweekday')).not.toBeInTheDocument();
    });

    it('shows the repeat-every input for minutely', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'minutely' });
      expect(screen.getByTestId('osquery-schedule-repeat-every')).toBeInTheDocument();
    });

    it('shows the byweekday checkboxes for custom (weekly)', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'custom' });
      expect(screen.getByTestId('osquery-schedule-byweekday')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-repeat-every')).toBeInTheDocument();
    });

    it('shows the day-of-month input for monthly', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'monthly' });
      expect(screen.getByTestId('osquery-schedule-bymonthday')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-bymonth')).not.toBeInTheDocument();
    });

    it('shows month and day-of-month inputs for yearly', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'yearly' });
      expect(screen.getByTestId('osquery-schedule-bymonth')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-bymonthday')).toBeInTheDocument();
    });
  });

  describe('toggle states', () => {
    it('disables the stop-after date picker until the toggle is on', async () => {
      const user = userEvent.setup();
      renderSection();
      await enterRruleMode({ frequency: 'daily' });

      // EuiDatePicker renders an inner input that carries the disabled state;
      // the outer `osquery-schedule-stop-after-date` span only forwards styles.
      const getDateInput = () =>
        screen
          .getByTestId('osquery-schedule-stop-after-date')
          .querySelector('input') as HTMLInputElement;

      expect(getDateInput()).toBeDisabled();

      await user.click(screen.getByTestId('osquery-schedule-stop-after-toggle'));

      expect(getDateInput()).not.toBeDisabled();
    });

    it('disables the splay value/unit until the toggle is on', async () => {
      const user = userEvent.setup();
      renderSection();
      await enterRruleMode({ frequency: 'daily' });

      const splayValue = screen.getByTestId('osquery-schedule-splay-value');
      const splayUnit = screen.getByTestId('osquery-schedule-splay-unit');
      expect(splayValue).toBeDisabled();
      expect(splayUnit).toBeDisabled();

      await user.click(screen.getByTestId('osquery-schedule-splay-toggle'));

      expect(splayValue).not.toBeDisabled();
      expect(splayUnit).not.toBeDisabled();
    });
  });

  describe('validation', () => {
    it('requires start_date when in rrule mode', async () => {
      renderSection();
      await enterRruleMode({ frequency: 'daily', start_date: '' });

      let isValid = true;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(false);
      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    it('requires at least one weekday when frequency is custom', async () => {
      renderSection();
      await enterRruleMode({
        frequency: 'custom',
        start_date: '2024-01-01T00:00:00.000Z',
        byweekday: [],
      });

      let isValid = true;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(false);
      await waitFor(() => {
        expect(screen.getByText('Select at least one day of the week')).toBeInTheDocument();
      });
    });

    it('rejects splay durations larger than 12 hours', async () => {
      renderSection();
      await enterRruleMode({
        frequency: 'daily',
        start_date: '2024-01-01T00:00:00.000Z',
        splay_enabled: true,
        splay_value: 13,
        splay_unit: 'hours',
      });

      let isValid = true;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(false);
      await waitFor(() => {
        expect(screen.getByText('Splay duration must not exceed 12 hours')).toBeInTheDocument();
      });
    });

    it('accepts splay durations at the 12-hour boundary', async () => {
      renderSection();
      await enterRruleMode({
        frequency: 'daily',
        start_date: '2024-01-01T00:00:00.000Z',
        splay_enabled: true,
        splay_value: 12,
        splay_unit: 'hours',
        end_date_enabled: false,
      });

      let isValid = false;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(true);
    });

    it('passes validation for a complete weekly recurrence', async () => {
      renderSection();
      await enterRruleMode({
        frequency: 'custom',
        start_date: '2024-01-01T00:00:00.000Z',
        byweekday: [Weekday.MO, Weekday.WE, Weekday.FR],
        repeat_every: 1,
        splay_enabled: false,
        end_date_enabled: false,
      });

      let isValid = false;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(true);
    });

    it('rejects an end_date that is on or before the start_date', async () => {
      renderSection();
      await enterRruleMode({
        frequency: 'daily',
        start_date: '2024-06-01T00:00:00.000Z',
        end_date_enabled: true,
        end_date: '2024-01-01T00:00:00.000Z',
      });

      let isValid = true;
      await act(async () => {
        isValid = await formHandleRef.current!.trigger();
      });

      expect(isValid).toBe(false);
      await waitFor(() => {
        expect(screen.getByText('End date must be after the start date')).toBeInTheDocument();
      });
    });
  });
});
