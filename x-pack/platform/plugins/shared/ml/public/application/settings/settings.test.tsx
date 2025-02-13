/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

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
    const wrapper = mountWithIntl(<Settings />);

    const filterMngButton = wrapper
      .find('[data-test-subj="mlFilterListsMngButton"]')
      .find('EuiButtonEmpty');
    expect(filterMngButton.prop('isDisabled')).toBe(isFilterListsMngDisabled);

    const filterCreateButton = wrapper
      .find('[data-test-subj="mlFilterListsCreateButton"]')
      .find('EuiButtonEmpty');
    expect(filterCreateButton.prop('isDisabled')).toBe(isFilterListCreateDisabled);

    const calendarMngButton = wrapper
      .find('[data-test-subj="mlCalendarsMngButton"]')
      .find('EuiButtonEmpty');
    expect(calendarMngButton.prop('isDisabled')).toBe(isCalendarsMngDisabled);

    const calendarCreateButton = wrapper
      .find('[data-test-subj="mlCalendarsCreateButton"]')
      .find('EuiButtonEmpty');
    expect(calendarCreateButton.prop('isDisabled')).toBe(isCalendarCreateDisabled);
  }

  test('should render settings page with all buttons enabled when full user capabilities', () => {
    runCheckButtonsDisabledTest(false, false, false, false);
  });
});
