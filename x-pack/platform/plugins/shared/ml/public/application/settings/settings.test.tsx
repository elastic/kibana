/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderWithI18n } from '../test_utils/render_with_ml_context';
import { screen } from '@testing-library/react';

import { Settings } from './settings';

vi.mock('../contexts/kibana');
vi.mock('../contexts/kibana/use_notifications_context', () => {
  return {
    useNotifications: () => ({
      toasts: { addDanger: vi.fn(), addError: vi.fn() },
    }),
  };
});
vi.mock('../services/toast_notification_service', () => {
  const mocked = {
    useToastNotificationService: () => {
      return {
        displayErrorToast: vi.fn(),
      };
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../contexts/kibana/use_create_url', () => {
  const mocked = {
    useCreateAndNavigateToMlLink: vi.fn(),
    useCreateAndNavigateToManagementMlLink: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

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
