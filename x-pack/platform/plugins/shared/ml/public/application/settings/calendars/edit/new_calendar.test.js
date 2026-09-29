/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithMlI18nContext } from '../../../test_utils/render_with_ml_context';

vi.mock('../../../contexts/kibana/use_create_url', () => {
  const mocked = {
    useCreateAndNavigateToManagementMlLink: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../components/help_menu', () => {
  const mocked = {
    HelpMenu: () => <div id="mockHelpMenu" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../capabilities/check_capabilities', () => {
  const mocked = {
    checkPermission: () => true,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../license', () => {
  const mocked = {
    hasLicenseExpired: () => false,
    isFullLicense: () => false,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../capabilities/get_capabilities', () => {
  const mocked = {
    getCapabilities: () => {},
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../ml_nodes_check/check_ml_nodes', () => {
  const mocked = {
    mlNodesAvailable: () => true,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../capabilities/check_capabilities', () => {
  const mocked = {
    usePermissionCheck: () => [true, true],
  };
  return { ...mocked, default: mocked };
});

const calendarsMock = [
  {
    calendar_id: 'farequote-calendar',
    job_ids: ['farequote'],
    description: 'test ',
    events: [
      {
        description: 'Downtime feb 9 2017 10:10 to 10:30',
        start_time: 1486656600000,
        end_time: 1486657800000,
        calendar_id: 'farequote-calendar',
        event_id: 'Ee-YgGcBxHgQWEhCO_xj',
      },
    ],
  },
  {
    calendar_id: 'this-is-a-new-calendar',
    job_ids: ['test'],
    description: 'new calendar',
    events: [
      {
        description: 'New event!',
        start_time: 1544076000000,
        end_time: 1544162400000,
        calendar_id: 'this-is-a-new-calendar',
        event_id: 'ehWKhGcBqHkXuWNrIrSV',
      },
    ],
  },
];

vi.mock('./utils', async () => {
  const mocked = {
    ...(await vi.importActual('./utils')),
    getCalendarSettingsData: vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolve({
            jobIds: ['test-job-one', 'test-job-2'],
            groupIds: ['test-group-one', 'test-group-two'],
            calendars: calendarsMock,
          });
        })
    ),
  };
  return { ...mocked, default: mocked };
});

const mockAddDanger = vi.fn();
const mockKibanaContext = {
  services: {
    application: {
      navigateToApp: vi.fn(),
      getUrlForApp: vi.fn(() => '/app/management/ml/ad_settings/calendars_list'),
    },
    docLinks: { links: { ml: { calendars: 'test' } } },
    notifications: { toasts: { addDanger: mockAddDanger, addError: vi.fn() } },
    mlServices: {
      mlApi: {
        calendars: () => {
          return Promise.resolve([]);
        },
        jobs: {
          jobsSummary: () => {
            return Promise.resolve([]);
          },
          groups: () => {
            return Promise.resolve([]);
          },
        },
      },
    },
  },
};

const mockReact = React;
vi.mock('@kbn/kibana-react-plugin/public', () => ({
  __esModule: true,
  useKibana: () => mockKibanaContext,
  withKibana: (type) => {
    const EnhancedType = (props) => {
      return mockReact.createElement(type, {
        ...props,
        kibana: mockKibanaContext,
      });
    };
    return EnhancedType;
  },
}));

vi.mock('../../../contexts/kibana', () => {
  const mocked = {
    useMlKibana: () => mockKibanaContext,
    useNavigateToPath: () => vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { NewCalendar } from './new_calendar';

describe('NewCalendar', () => {
  test('Renders new calendar form', () => {
    const { getByTestId } = renderWithMlI18nContext(<NewCalendar isDst={false} />);

    expect(getByTestId('mlPageCalendarEdit')).toBeInTheDocument();
  });

  test('Import modal button is disabled', () => {
    const { getByTestId } = renderWithMlI18nContext(<NewCalendar isDst={false} />);

    const importEventsButton = getByTestId('mlCalendarImportEventsButton');
    expect(importEventsButton).toBeInTheDocument();
    expect(importEventsButton).toBeDisabled();
  });

  test('New event modal button is disabled', async () => {
    const { getByTestId } = renderWithMlI18nContext(<NewCalendar isDst={false} />);

    const newEventButton = getByTestId('mlCalendarNewEventButton');
    expect(newEventButton).toBeInTheDocument();
    expect(newEventButton).toBeDisabled();
  });

  test('isDuplicateId returns true if form calendar id already exists in calendars', async () => {
    const { getByTestId, queryByTestId, getByText } = renderWithMlI18nContext(
      <NewCalendar isDst={false} />
    );

    const mlCalendarIdFormRow = getByText('Calendar ID');
    expect(mlCalendarIdFormRow).toBeInTheDocument();
    const mlCalendarIdInput = queryByTestId('mlCalendarIdInput');
    expect(mlCalendarIdInput).toBeInTheDocument();

    await waitFor(() => {
      expect(mlCalendarIdInput).toBeEnabled();
    });

    await userEvent.type(mlCalendarIdInput, 'this-is-a-new-calendar');

    await waitFor(() => {
      expect(mlCalendarIdInput).toHaveValue('this-is-a-new-calendar');
    });

    const mlSaveCalendarButton = getByTestId('mlSaveCalendarButton');
    expect(mlSaveCalendarButton).toBeInTheDocument();
    expect(mlSaveCalendarButton).toBeEnabled();

    await userEvent.click(mlSaveCalendarButton);

    expect(mockAddDanger).toHaveBeenCalledWith(
      'Cannot create calendar with id [this-is-a-new-calendar] as it already exists.'
    );
  });
});
