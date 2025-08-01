/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

import { Settings } from './settings';
import { AnomalyDetectionSettingsContext } from './anomaly_detection_settings_context';

jest.mock('../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
}));

jest.mock('../contexts/kibana', () => ({
  useNotifications: () => ({
    toasts: { addDanger: jest.fn(), addError: jest.fn() },
  }),
  useMlApi: () => ({
    calendars: jest.fn().mockResolvedValue([]),
    filters: { filtersStats: jest.fn().mockResolvedValue([]) },
  }),
  useMlKibana: () => ({
    services: {
      docLinks: {
        links: {
          ml: { guide: jest.fn() },
        },
      },
    },
  }),
}));

jest.mock('../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToMlLink: jest.fn(),
}));

describe('Settings', () => {
  function runCheckButtonsDisabledTest(
    canGetFilters: boolean,
    canCreateFilter: boolean,
    canGetCalendars: boolean,
    canCreateCalendar: boolean,
    isFilterListsMngDisabled: boolean,
    isFilterListCreateDisabled: boolean,
    isCalendarsMngDisabled: boolean,
    isCalendarCreateDisabled: boolean
  ) {
    renderWithI18n(
      <AnomalyDetectionSettingsContext.Provider
        value={{
          canGetFilters,
          canCreateFilter,
          canGetCalendars,
          canCreateCalendar,
        }}
      >
        <Settings />
      </AnomalyDetectionSettingsContext.Provider>
    );

    // Check filter lists manage button
    const filterMngButton = screen.getByTestId('mlFilterListsMngButton');
    expect(filterMngButton.hasAttribute('disabled')).toBe(isFilterListsMngDisabled);

    // Check filter lists create button
    const filterCreateButton = screen.getByTestId('mlFilterListsCreateButton');
    expect(filterCreateButton.hasAttribute('disabled')).toBe(isFilterListCreateDisabled);

    // Check calendars manage button
    const calendarMngButton = screen.getByTestId('mlCalendarsMngButton');
    expect(calendarMngButton.hasAttribute('disabled')).toBe(isCalendarsMngDisabled);

    // Check calendars create button
    const calendarCreateButton = screen.getByTestId('mlCalendarsCreateButton');
    expect(calendarCreateButton.hasAttribute('disabled')).toBe(isCalendarCreateDisabled);
  }

  test('should render settings page with all buttons enabled when full user capabilities', () => {
    runCheckButtonsDisabledTest(true, true, true, true, false, false, false, false);
  });

  test('should disable Filter Lists buttons if filters capabilities are false', () => {
    runCheckButtonsDisabledTest(false, false, true, true, true, true, false, false);
  });

  test('should disable Calendars buttons if calendars capabilities are false', () => {
    runCheckButtonsDisabledTest(true, true, false, false, false, false, true, true);
  });
});
