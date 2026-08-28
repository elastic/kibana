/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { ScheduleSection } from '..';
import {
  ADVANCED_PARTS_ADVISORY_TITLE,
  SCHEDULE_SECTION_TITLE,
  SCHEDULE_TYPE_LOCKED_HELP,
} from '../translations';
import { createDefaultScheduleFormData } from '../types';
import type { ScheduleFormData } from '../types';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { renderWithProviders } from './test_helpers';
import { roundUpTo30Min, floorTo30Min } from '../slot_utils';

const flagOn = { ...allowedExperimentalValues, rruleScheduling: true };

const renderFlagOn = (ui: React.ReactElement) =>
  renderWithProviders(ui, { experimentalFeatures: flagOn });

const intervalState = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...createDefaultScheduleFormData('interval'),
  ...overrides,
});

const recurrenceState = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...createDefaultScheduleFormData('rrule'),
  ...overrides,
});

describe('ScheduleSection', () => {
  describe('feature-flag gate', () => {
    it('renders nothing when `rruleScheduling` is off', () => {
      const { container } = renderWithProviders(
        <ScheduleSection value={intervalState()} onChange={jest.fn()} />,
        { experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false } }
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('osquery-schedule-section')).not.toBeInTheDocument();
    });
  });

  describe('rendering with the flag on', () => {
    it('renders the section title by default', () => {
      renderFlagOn(<ScheduleSection value={intervalState()} onChange={jest.fn()} />);

      expect(screen.getByText(SCHEDULE_SECTION_TITLE)).toBeInTheDocument();
    });

    it('omits the title when `title={null}` is passed (embedded QueryFlyout shape)', () => {
      renderFlagOn(<ScheduleSection value={intervalState()} onChange={jest.fn()} title={null} />);

      expect(screen.queryByText(SCHEDULE_SECTION_TITLE)).not.toBeInTheDocument();
      // Still renders the type selector + body — only the heading is suppressed.
      expect(screen.getByTestId('osquery-schedule-type-selector')).toBeInTheDocument();
    });

    it('renders the interval body when scheduleType is "interval"', () => {
      renderFlagOn(<ScheduleSection value={intervalState()} onChange={jest.fn()} />);

      expect(screen.getByTestId('osquery-schedule-interval')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-start-date')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-frequency-selector')).not.toBeInTheDocument();
    });

    it('renders the recurrence body when scheduleType is "rrule"', () => {
      renderFlagOn(<ScheduleSection value={recurrenceState()} onChange={jest.fn()} />);

      expect(screen.getByTestId('osquery-schedule-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-frequency-selector')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-stop-after-toggle-row')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-splay-toggle-row')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-interval')).not.toBeInTheDocument();
    });
  });

  describe('advanced-parts advisory', () => {
    it('renders the advisory when recurrence carries non-empty `_unknown` parts', () => {
      const state = recurrenceState({
        recurrence: {
          ...recurrenceState().recurrence,
          _unknown: { BYHOUR: '9' },
        },
      });

      renderFlagOn(<ScheduleSection value={state} onChange={jest.fn()} />);

      expect(screen.getByText(ADVANCED_PARTS_ADVISORY_TITLE)).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-advanced-parts-advisory')).toBeInTheDocument();
    });

    it('does NOT render the advisory when `_unknown` is undefined', () => {
      renderFlagOn(<ScheduleSection value={recurrenceState()} onChange={jest.fn()} />);

      expect(
        screen.queryByTestId('osquery-schedule-advanced-parts-advisory')
      ).not.toBeInTheDocument();
    });

    it('does NOT render the advisory when `_unknown` is an empty object', () => {
      const state = recurrenceState({
        recurrence: {
          ...recurrenceState().recurrence,
          _unknown: {},
        },
      });

      renderFlagOn(<ScheduleSection value={state} onChange={jest.fn()} />);

      expect(
        screen.queryByTestId('osquery-schedule-advanced-parts-advisory')
      ).not.toBeInTheDocument();
    });

    it('does NOT render the advisory in interval mode (even if `_unknown` exists)', () => {
      const state = intervalState({
        recurrence: {
          ...intervalState().recurrence,
          _unknown: { BYHOUR: '9' },
        },
      });

      renderFlagOn(<ScheduleSection value={state} onChange={jest.fn()} />);

      expect(
        screen.queryByTestId('osquery-schedule-advanced-parts-advisory')
      ).not.toBeInTheDocument();
    });
  });

  describe('change propagation', () => {
    describe('switching from interval to rrule', () => {
      const NOW = new Date('2026-06-19T12:00:00.000Z');

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(NOW);
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('re-seeds startDate to a fresh valid slot instead of carrying the interval-era value', () => {
        const onChange = jest.fn();
        const staleStartDate = new Date('2024-01-01T00:00:00.000Z');
        const state = intervalState({ startDate: staleStartDate });
        renderFlagOn(<ScheduleSection value={state} onChange={onChange} />);

        fireEvent.click(screen.getByTestId('osquery-schedule-type-rrule'));

        const expectedStartDate = roundUpTo30Min(NOW);
        expect(onChange).toHaveBeenCalledWith({
          ...state,
          scheduleType: 'rrule',
          startDate: expectedStartDate,
          stopAfter: {
            ...state.stopAfter,
            date: new Date(expectedStartDate.getTime() + 24 * 60 * 60 * 1000),
          },
        });

        const [[calledWith]] = onChange.mock.calls;
        expect(calledWith.startDate.getTime()).toBeGreaterThanOrEqual(floorTo30Min(NOW).getTime());
      });

      it('does not re-seed when already in rrule mode (clicking the selected card is a no-op)', () => {
        // Same-mode click never fires onChange, so handleTypeChange never runs.
        const onChange = jest.fn();
        const chosenStartDate = new Date('2026-06-25T00:00:00.000Z');
        const state = recurrenceState({ startDate: chosenStartDate });
        renderFlagOn(<ScheduleSection value={state} onChange={onChange} />);

        fireEvent.click(screen.getByTestId('osquery-schedule-type-rrule'));

        expect(onChange).not.toHaveBeenCalled();
      });

      // Regression (PR #276996 review, @szwarckonrad): round-tripping through
      // Interval must not clobber a still-valid custom rrule startDate/stopAfter.
      it('preserves a still-valid custom startDate/stopAfter across a round trip through Interval mode', () => {
        const onChange = jest.fn();
        const customStartDate = new Date('2026-06-25T00:00:00.000Z'); // in the future relative to NOW
        const customStopAfter = new Date('2026-06-26T00:00:00.000Z');
        const rruleState = recurrenceState({
          startDate: customStartDate,
          stopAfter: { enabled: true, date: customStopAfter },
        });

        const intervalAfterRoundTrip = { ...rruleState, scheduleType: 'interval' as const };
        renderFlagOn(<ScheduleSection value={intervalAfterRoundTrip} onChange={onChange} />);

        fireEvent.click(screen.getByTestId('osquery-schedule-type-rrule'));

        expect(onChange).toHaveBeenCalledWith({
          ...intervalAfterRoundTrip,
          scheduleType: 'rrule',
        });
      });

      it('still re-seeds when the custom startDate has gone stale while dwelling in Interval mode', () => {
        const onChange = jest.fn();
        const customStartDate = new Date('2026-06-19T13:00:00.000Z'); // valid when picked...
        const rruleState = recurrenceState({ startDate: customStartDate });
        const intervalAfterRoundTrip = { ...rruleState, scheduleType: 'interval' as const };

        renderFlagOn(<ScheduleSection value={intervalAfterRoundTrip} onChange={onChange} />);

        // Time passes while dwelling in Interval mode; startDate goes stale.
        jest.setSystemTime(new Date('2026-06-19T14:00:00.000Z'));

        fireEvent.click(screen.getByTestId('osquery-schedule-type-rrule'));

        const expectedStartDate = roundUpTo30Min(new Date('2026-06-19T14:00:00.000Z'));
        expect(onChange).toHaveBeenCalledWith({
          ...intervalAfterRoundTrip,
          scheduleType: 'rrule',
          startDate: expectedStartDate,
          stopAfter: {
            ...intervalAfterRoundTrip.stopAfter,
            date: new Date(expectedStartDate.getTime() + 24 * 60 * 60 * 1000),
          },
        });
      });
    });

    it('propagates an interval change in interval mode', () => {
      const onChange = jest.fn();
      const state = intervalState({ interval: 60 });
      renderFlagOn(<ScheduleSection value={state} onChange={onChange} />);

      fireEvent.change(screen.getByTestId('osquery-schedule-interval'), {
        target: { value: '120' },
      });

      expect(onChange).toHaveBeenCalledWith({ ...state, interval: 120 });
    });
  });

  describe('same-mode constraint (lockedScheduleType)', () => {
    it('locks the selector to the parent-supplied mode and surfaces the help text', () => {
      renderFlagOn(
        <ScheduleSection
          value={recurrenceState()}
          onChange={jest.fn()}
          lockedScheduleType="rrule"
        />
      );

      expect(screen.getByText(SCHEDULE_TYPE_LOCKED_HELP)).toBeInTheDocument();
    });

    it('rejects type-switch attempts when locked', () => {
      const onChange = jest.fn();
      renderFlagOn(
        <ScheduleSection value={recurrenceState()} onChange={onChange} lockedScheduleType="rrule" />
      );

      fireEvent.click(screen.getByTestId('osquery-schedule-type-interval'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
