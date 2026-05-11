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
import { QuickSnoozePanel } from './quick_snooze_panel';
import { SNOOZE_DATE_DISPLAY_FORMAT } from './constants';

const MOCKED_NOW = '2026-03-09T19:05:00.000Z';

jest.mock('moment', () => {
  const actual = jest.requireActual('moment');
  return Object.assign(
    (...args: unknown[]) => (args.length ? actual(...args) : actual(MOCKED_NOW)),
    actual,
    { tz: { guess: () => 'UTC' } }
  );
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('QuickSnoozePanel', () => {
  const onScheduleChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('duration options', () => {
    it('renders all preset duration options', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(screen.getByText('How long should this alert be snoozed?')).toBeInTheDocument();
      expect(screen.getByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
      expect(screen.getByText('Indefinitely')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
      expect(screen.getByText('8h')).toBeInTheDocument();
      expect(screen.getByText('24h')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('shows indefinitely message when Indefinitely is selected (default)', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      expect(screen.getByTestId('quickSnoozeUnsnoozeTime')).toHaveTextContent(
        'Alert will be snoozed indefinitely'
      );
      expect(onScheduleChangeMock).toHaveBeenCalledWith(null);
    });

    it('shows unsnooze date when a preset duration is selected', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('1h'));

      const expectedDate = moment(MOCKED_NOW).add(1, 'h').format(SNOOZE_DATE_DISPLAY_FORMAT);
      expect(screen.getByTestId('quickSnoozeUnsnoozeTime')).toHaveTextContent(
        `Alert will unsnooze on ${expectedDate}`
      );
    });

    it('calls onScheduleChange with an ISO date string when a preset duration is selected', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('8h'));

      expect(onScheduleChangeMock).toHaveBeenCalledWith(
        moment(MOCKED_NOW).add(8, 'h').toISOString()
      );
    });
  });

  describe('custom duration mode', () => {
    it('shows custom mode tabs when Custom is selected', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));

      expect(screen.getByTestId('buttonGroupModeOptions')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Date & time')).toBeInTheDocument();
    });

    it('shows duration inputs by default in custom mode', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));

      expect(screen.getByTestId('durationInputs')).toBeInTheDocument();
      expect(screen.getByTestId('durationValue')).toBeInTheDocument();
      expect(screen.getByTestId('durationUnit')).toBeInTheDocument();
    });

    it('shows datetime picker when Date & time mode is selected', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));
      fireEvent.click(screen.getByText('Date & time'));

      expect(screen.getByTestId('dateTimeInputs')).toBeInTheDocument();
      expect(screen.queryByTestId('durationInputs')).not.toBeInTheDocument();
    });

    it('shows a validation error and calls onScheduleChange with undefined when duration value is less than 1', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));
      fireEvent.change(screen.getByTestId('durationValue'), { target: { value: '-1' } });

      expect(
        screen.getByText('Duration must be a whole number of at least 1.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('quickSnoozeUnsnoozeTime')).not.toBeInTheDocument();
      expect(onScheduleChangeMock).toHaveBeenCalledWith(undefined);
    });

    it('calls onScheduleChange with an ISO date string when a valid custom duration is entered', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));
      fireEvent.change(screen.getByTestId('durationValue'), { target: { value: '2' } });
      fireEvent.change(screen.getByTestId('durationUnit'), { target: { value: 'w' } });

      expect(onScheduleChangeMock).toHaveBeenCalledWith(
        moment(MOCKED_NOW).add(2, 'w').toISOString()
      );
    });

    it('hides custom inputs when switching back to a preset', () => {
      render(<QuickSnoozePanel onScheduleChange={onScheduleChangeMock} />, { wrapper });

      fireEvent.click(screen.getByText('Custom'));
      expect(screen.getByTestId('buttonGroupModeOptions')).toBeInTheDocument();

      fireEvent.click(screen.getByText('8h'));
      expect(screen.queryByTestId('buttonGroupModeOptions')).not.toBeInTheDocument();
    });
  });
});
