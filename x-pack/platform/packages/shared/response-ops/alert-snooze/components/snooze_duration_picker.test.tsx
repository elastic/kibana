/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import moment from 'moment';
import { SnoozeDurationPicker } from './snooze_duration_picker';
import type { CustomDurationState } from './types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const defaultValue: CustomDurationState = {
  mode: 'duration',
  value: 1,
  unit: 'h',
  dateTime: null,
};

describe('SnoozeDurationPicker', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mode switching', () => {
    it('renders duration inputs by default', () => {
      render(<SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} />, { wrapper });

      expect(screen.getByTestId('durationInputs')).toBeInTheDocument();
      expect(screen.queryByTestId('dateTimeInputs')).not.toBeInTheDocument();
    });

    it('calls onChange with datetime mode when Date & time button is clicked', () => {
      render(<SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Date & time'));

      expect(onChangeMock).toHaveBeenCalledWith({ mode: 'datetime' });
    });

    it('renders datetime inputs when mode is datetime', () => {
      render(
        <SnoozeDurationPicker
          value={{ ...defaultValue, mode: 'datetime' }}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('dateTimeInputs')).toBeInTheDocument();
      expect(screen.queryByTestId('durationInputs')).not.toBeInTheDocument();
    });

    it('calls onChange with duration mode when Duration button is clicked', () => {
      render(
        <SnoozeDurationPicker
          value={{ ...defaultValue, mode: 'datetime' }}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      fireEvent.click(screen.getByText('Duration'));

      expect(onChangeMock).toHaveBeenCalledWith({ mode: 'duration' });
    });
  });

  describe('duration mode', () => {
    it('calls onChange with updated value when the number input changes', () => {
      render(<SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} />, { wrapper });

      fireEvent.change(screen.getByTestId('durationValue'), {
        target: { value: '5' },
      });

      expect(onChangeMock).toHaveBeenCalledWith({ value: 5 });
    });

    it('calls onChange with updated unit when the unit select changes', () => {
      render(<SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} />, { wrapper });

      fireEvent.change(screen.getByTestId('durationUnit'), {
        target: { value: 'd' },
      });

      expect(onChangeMock).toHaveBeenCalledWith({ unit: 'd' });
    });

    it('shows the invalid duration error message when isDurationInvalid is true', () => {
      render(
        <SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} isDurationInvalid />,
        { wrapper }
      );

      expect(
        screen.getByText('Duration must be a whole number of at least 1.')
      ).toBeInTheDocument();
    });

    it('does not show the duration error message when isDurationInvalid is false', () => {
      render(<SnoozeDurationPicker value={defaultValue} onChange={onChangeMock} />, { wrapper });

      expect(
        screen.queryByText('Duration must be a whole number of at least 1.')
      ).not.toBeInTheDocument();
    });
  });

  describe('datetime mode', () => {
    const datetimeValue: CustomDurationState = {
      ...defaultValue,
      mode: 'datetime',
    };

    it('renders the date picker with no clear button when dateTime is null', () => {
      render(<SnoozeDurationPicker value={datetimeValue} onChange={onChangeMock} />, { wrapper });

      expect(screen.getByTestId('dateTimePicker')).toBeInTheDocument();
      expect(screen.queryByTestId('dateTimeClear')).not.toBeInTheDocument();
    });

    it('shows the clear button when dateTime is set', () => {
      render(
        <SnoozeDurationPicker
          value={{ ...datetimeValue, dateTime: moment() }}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      expect(screen.getByTestId('dateTimeClear')).toBeInTheDocument();
    });

    it('calls onChange with dateTime null when the clear button is clicked', () => {
      render(
        <SnoozeDurationPicker
          value={{ ...datetimeValue, dateTime: moment() }}
          onChange={onChangeMock}
        />,
        { wrapper }
      );

      fireEvent.click(screen.getByTestId('dateTimeClear'));

      expect(onChangeMock).toHaveBeenCalledWith({ dateTime: null });
    });

    it('shows the past datetime error message when isDateTimeInvalid is true', () => {
      render(
        <SnoozeDurationPicker value={datetimeValue} onChange={onChangeMock} isDateTimeInvalid />,
        { wrapper }
      );

      expect(
        screen.getByText('Cannot snooze an alert for a past date or time.')
      ).toBeInTheDocument();
    });

    it('does not show the datetime error message when isDateTimeInvalid is false', () => {
      render(<SnoozeDurationPicker value={datetimeValue} onChange={onChangeMock} />, { wrapper });

      expect(
        screen.queryByText('Cannot snooze an alert for a past date or time.')
      ).not.toBeInTheDocument();
    });
  });
});
