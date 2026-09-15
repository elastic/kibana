/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import React from 'react';
import { BaseSnoozePanel } from './base_snooze_panel';

describe('BaseSnoozePanel', () => {
  test('should render', () => {
    renderWithI18n(
      <BaseSnoozePanel
        hasTitle
        interval="5d"
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(screen.getByTestId('snoozePanel')).toBeInTheDocument();
    expect(screen.getByTestId('snoozePanelTitle')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSnoozeIntervalValue')).toHaveValue(5);
    expect(screen.getByTestId('ruleSnoozeIntervalUnit')).toHaveValue('d');
    expect(screen.queryByTestId('ruleSnoozeCancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleAddSchedule')).toBeInTheDocument();
  });

  test('should render without title', () => {
    renderWithI18n(
      <BaseSnoozePanel
        hasTitle={false}
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(screen.getByTestId('snoozePanel')).toBeInTheDocument();
    expect(screen.queryByTestId('snoozePanelTitle')).not.toBeInTheDocument();
  });

  test('should render with cancel button', () => {
    renderWithI18n(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={true}
        scheduledSnoozes={[]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(screen.getByTestId('snoozePanel')).toBeInTheDocument();
    expect(screen.getByTestId('ruleSnoozeCancel')).toBeInTheDocument();
  });

  test('should render a list of scheduled snoozes', () => {
    renderWithI18n(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[
          {
            id: '1',
            duration: 864000,
            rRule: {
              dtstart: '9999-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '2',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
        ]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );
    expect(screen.getByTestId('snoozePanel')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleAddSchedule')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleRemoveAllSchedules')).toBeInTheDocument();
    const ruleSchedulesListAddButton = screen.getByTestId('ruleSchedulesListAddButton');
    expect(ruleSchedulesListAddButton).toBeInTheDocument();
    expect(ruleSchedulesListAddButton).not.toBeDisabled();

    expect(screen.getByTestId('ruleSchedulesList').children.length).toEqual(2);
  });

  test('should disable add snooze schedule button if rule has more than 5 schedules', () => {
    renderWithI18n(
      <BaseSnoozePanel
        hasTitle
        isLoading={false}
        showCancel={false}
        scheduledSnoozes={[
          {
            id: '1',
            duration: 864000,
            rRule: {
              dtstart: '9999-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '2',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '3',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '4',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
          {
            id: '5',
            duration: 864000,
            rRule: {
              dtstart: '7070-01-01T12:00:00.000Z',
              tzid: 'UTC',
            },
          },
        ]}
        activeSnoozes={[]}
        snoozeRule={jest.fn()}
        unsnoozeRule={jest.fn()}
        navigateToScheduler={jest.fn()}
        onRemoveAllSchedules={jest.fn()}
      />
    );

    const ruleSchedulesListAddButton = screen.getByTestId('ruleSchedulesListAddButton');
    expect(ruleSchedulesListAddButton).toBeInTheDocument();
    expect(ruleSchedulesListAddButton).toBeDisabled();
  });
});
