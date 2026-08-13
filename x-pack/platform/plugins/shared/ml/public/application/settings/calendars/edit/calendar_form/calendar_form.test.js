/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '../../../../test_utils/render_with_ml_context';

import { CalendarForm } from './calendar_form';

jest.mock('../../../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToManagementMlLink: jest.fn(),
}));
jest.mock('../../../../capabilities/check_capabilities', () => ({
  usePermissionCheck: () => [true, true],
}));
jest.mock('../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      application: {
        navigateToApp: jest.fn(),
        getUrlForApp: jest.fn(() => '/app/management/ml/ad_settings/calendars_list'),
      },
    },
  }),
  useNavigateToPath: () => jest.fn(),
}));

const testProps = {
  calendarId: '',
  canCreateCalendar: true,
  canDeleteCalendar: true,
  description: '',
  eventsList: [],
  groupIds: [],
  isEdit: false,
  isNewCalendarIdValid: false,
  jobIds: [],
  onCalendarIdChange: jest.fn(),
  onCreate: jest.fn(),
  onCreateGroupOption: jest.fn(),
  onDescriptionChange: jest.fn(),
  onEdit: jest.fn(),
  onEventDelete: jest.fn(),
  onGroupSelection: jest.fn(),
  showImportModal: jest.fn(),
  onJobSelection: jest.fn(),
  saving: false,
  selectedGroupOptions: [],
  selectedJobOptions: [],
  showNewEventModal: jest.fn(),
  isGlobalCalendar: false,
  isDst: false,
};

describe('CalendarForm', () => {
  test('Renders calendar form', () => {
    const { getByTestId } = renderWithI18n(<CalendarForm {...testProps} />);

    expect(getByTestId('mlCalendarFormNew')).toBeInTheDocument();
    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Create new calendar');
    expect(getByTestId('mlCalendarIdInput')).toHaveValue('');
    expect(getByTestId('mlCalendarDescriptionInput')).toHaveValue('');
  });

  test('CalendarId shown as title when editing', () => {
    const editProps = {
      ...testProps,
      isEdit: true,
      calendarId: 'test-calendar',
      description: 'test description',
    };

    const { getByTestId } = renderWithI18n(<CalendarForm {...editProps} />);

    const calendarForm = getByTestId('mlCalendarFormEdit');
    expect(calendarForm).toBeInTheDocument();
    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Calendar test-calendar');
    expect(getByTestId('mlCalendarDescriptionText')).toHaveTextContent('test description');
  });
});
