/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { RuleActionsAlertsFilterTimeframe } from './rule_actions_alerts_filter_timeframe';
import type { AlertsFilterTimeframe } from '@kbn/alerting-types';
import { getAction } from '../common/test_utils/actions_test_utils';

describe('ruleActionsAlertsFilterTimeframe', () => {
  function setup(timeframe?: AlertsFilterTimeframe) {
    return renderWithI18n(
      <RuleActionsAlertsFilterTimeframe
        action={getAction('1', { alertsFilter: { timeframe } })}
        settings={
          {
            client: {
              get: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
            },
          } as unknown as SettingsStart
        }
        onChange={() => {}}
      />
    );
  }

  it('renders an unchecked switch when passed a null timeframe', () => {
    setup();

    const toggle = screen.getByTestId('alertsFilterTimeframeToggle');
    expect(toggle).not.toBeChecked();
  });

  it('renders the passed in timeframe', () => {
    setup({
      days: [6, 7],
      timezone: 'America/Chicago',
      hours: { start: '10:00', end: '20:00' },
    });

    const toggle = screen.getByTestId('alertsFilterTimeframeToggle');
    expect(toggle).toBeChecked();

    const weekdayButtons = screen.getByTestId('alertsFilterTimeframeWeekdayButtons');

    expect(within(weekdayButtons).getByTestId('1')).toHaveAttribute('aria-pressed', 'false');
    expect(within(weekdayButtons).getByTestId('2')).toHaveAttribute('aria-pressed', 'false');
    expect(within(weekdayButtons).getByTestId('3')).toHaveAttribute('aria-pressed', 'false');
    expect(within(weekdayButtons).getByTestId('4')).toHaveAttribute('aria-pressed', 'false');
    expect(within(weekdayButtons).getByTestId('5')).toHaveAttribute('aria-pressed', 'false');
    expect(within(weekdayButtons).getByTestId('6')).toHaveAttribute('aria-pressed', 'true');
    expect(within(weekdayButtons).getByTestId('7')).toHaveAttribute('aria-pressed', 'true');

    const dateRange = screen.getByTestId('alertsFilterTimeframe');

    const startInput = within(dateRange).getAllByRole('textbox')[0];
    expect((startInput as HTMLInputElement).value).toMatch(/10:00/);

    const endInput = within(dateRange).getAllByRole('textbox')[1];
    expect((endInput as HTMLInputElement).value).toMatch(/20:00/);

    const timezoneComboBox = screen.getByTestId('alertsFilterTimeframeTimezone');
    expect(within(timezoneComboBox).getByRole('combobox')).toHaveValue('America/Chicago');
  });
});
