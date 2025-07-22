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

jest.mock('../contexts/kibana');
jest.mock('../contexts/kibana/use_notifications_context', () => {
  return {
    useNotifications: () => ({
      toasts: { addDanger: jest.fn(), addError: jest.fn() },
    }),
  };
});
jest.mock('../services/toast_notification_service', () => ({
  useToastNotificationService: () => {
    return {
      displayErrorToast: jest.fn(),
    };
  },
}));

jest.mock('../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToMlLink: jest.fn(),
  useCreateAndNavigateToManagementMlLink: jest.fn(),
}));

describe('Settings', () => {
  function runCheckButtonsDisabledTest(
    isFilterListsMngDisabled: boolean,
    isFilterListCreateDisabled: boolean,
    isCalendarsMngDisabled: boolean,
    isCalendarCreateDisabled: boolean
  ) {
    renderWithI18n(<Settings />);

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
    runCheckButtonsDisabledTest(false, false, false, false);
  });
});
