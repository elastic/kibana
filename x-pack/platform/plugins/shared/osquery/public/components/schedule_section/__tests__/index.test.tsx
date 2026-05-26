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
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { renderWithProviders } from './test_helpers';

const initFlag = (rruleScheduling: boolean) => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling },
  });
};

const intervalState = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...createDefaultScheduleFormData('interval'),
  ...overrides,
});

const recurrenceState = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...createDefaultScheduleFormData('rrule'),
  ...overrides,
});

describe('ScheduleSection', () => {
  describe('feature-flag gate (D25 / PR B ship boundary)', () => {
    beforeEach(() => {
      initFlag(false);
    });

    it('renders nothing when `rruleScheduling` is off', () => {
      const { container } = renderWithProviders(
        <ScheduleSection value={intervalState()} onChange={jest.fn()} />
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('osquery-schedule-section')).not.toBeInTheDocument();
    });
  });

  describe('rendering with the flag on', () => {
    beforeEach(() => {
      initFlag(true);
    });

    it('renders the section title by default', () => {
      renderWithProviders(<ScheduleSection value={intervalState()} onChange={jest.fn()} />);

      expect(screen.getByText(SCHEDULE_SECTION_TITLE)).toBeInTheDocument();
    });

    it('omits the title when `title={null}` is passed (embedded QueryFlyout shape)', () => {
      renderWithProviders(
        <ScheduleSection value={intervalState()} onChange={jest.fn()} title={null} />
      );

      expect(screen.queryByText(SCHEDULE_SECTION_TITLE)).not.toBeInTheDocument();
      // Still renders the type selector + body — only the heading is suppressed.
      expect(screen.getByTestId('osquery-schedule-type-selector')).toBeInTheDocument();
    });

    it('renders the interval body when scheduleType is "interval"', () => {
      renderWithProviders(<ScheduleSection value={intervalState()} onChange={jest.fn()} />);

      expect(screen.getByTestId('osquery-schedule-interval')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-start-date')).not.toBeInTheDocument();
      expect(screen.queryByTestId('osquery-frequency-selector')).not.toBeInTheDocument();
    });

    it('renders the recurrence body when scheduleType is "rrule"', () => {
      renderWithProviders(<ScheduleSection value={recurrenceState()} onChange={jest.fn()} />);

      expect(screen.getByTestId('osquery-schedule-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-frequency-selector')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-stop-after-toggle-row')).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-splay-toggle-row')).toBeInTheDocument();
      expect(screen.queryByTestId('osquery-schedule-interval')).not.toBeInTheDocument();
    });
  });

  describe('D22 advanced-parts advisory', () => {
    beforeEach(() => {
      initFlag(true);
    });

    it('renders the advisory when recurrence carries non-empty `_unknown` parts', () => {
      const state = recurrenceState({
        recurrence: {
          ...recurrenceState().recurrence,
          _unknown: { BYHOUR: '9' },
        },
      });

      renderWithProviders(<ScheduleSection value={state} onChange={jest.fn()} />);

      expect(screen.getByText(ADVANCED_PARTS_ADVISORY_TITLE)).toBeInTheDocument();
      expect(screen.getByTestId('osquery-schedule-advanced-parts-advisory')).toBeInTheDocument();
    });

    it('does NOT render the advisory when `_unknown` is undefined', () => {
      renderWithProviders(<ScheduleSection value={recurrenceState()} onChange={jest.fn()} />);

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

      renderWithProviders(<ScheduleSection value={state} onChange={jest.fn()} />);

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

      renderWithProviders(<ScheduleSection value={state} onChange={jest.fn()} />);

      expect(
        screen.queryByTestId('osquery-schedule-advanced-parts-advisory')
      ).not.toBeInTheDocument();
    });
  });

  describe('change propagation', () => {
    beforeEach(() => {
      initFlag(true);
    });

    it('switches scheduleType when the user picks the other card', () => {
      const onChange = jest.fn();
      const state = intervalState();
      renderWithProviders(<ScheduleSection value={state} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('osquery-schedule-type-rrule'));

      expect(onChange).toHaveBeenCalledWith({ ...state, scheduleType: 'rrule' });
    });

    it('propagates an interval change in interval mode', () => {
      const onChange = jest.fn();
      const state = intervalState({ interval: 60 });
      renderWithProviders(<ScheduleSection value={state} onChange={onChange} />);

      fireEvent.change(screen.getByTestId('osquery-schedule-interval'), {
        target: { value: '120' },
      });

      expect(onChange).toHaveBeenCalledWith({ ...state, interval: 120 });
    });
  });

  describe('D11 same-mode constraint (lockedScheduleType)', () => {
    beforeEach(() => {
      initFlag(true);
    });

    it('locks the selector to the parent-supplied mode and surfaces the help text', () => {
      renderWithProviders(
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
      renderWithProviders(
        <ScheduleSection value={recurrenceState()} onChange={onChange} lockedScheduleType="rrule" />
      );

      fireEvent.click(screen.getByTestId('osquery-schedule-type-interval'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
