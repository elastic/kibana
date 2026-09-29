/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderWithI18n } from '../../../../test_utils/render_with_ml_context';

import { CalendarForm } from './calendar_form';

vi.mock('../../../../contexts/kibana/use_create_url', () => {
      const mocked = {
      useCreateAndNavigateToManagementMlLink: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../capabilities/check_capabilities', () => {
      const mocked = {
      usePermissionCheck: () => [true, true],
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../contexts/kibana', () => {
      const mocked = {
      useMlKibana: () => ({
        services: {
          application: {
            navigateToApp: vi.fn(),
            getUrlForApp: vi.fn(() => '/app/management/ml/ad_settings/calendars_list'),
          },
        },
      }),
      useNavigateToPath: () => vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

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
  onCalendarIdChange: vi.fn(),
  onCreate: vi.fn(),
  onCreateGroupOption: vi.fn(),
  onDescriptionChange: vi.fn(),
  onEdit: vi.fn(),
  onEventDelete: vi.fn(),
  onGroupSelection: vi.fn(),
  showImportModal: vi.fn(),
  onJobSelection: vi.fn(),
  saving: false,
  selectedGroupOptions: [],
  selectedJobOptions: [],
  showNewEventModal: vi.fn(),
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
