/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { renderWithI18n } from '../../../test_utils/render_with_ml_context';

import { CalendarsListHeader } from './header';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));
jest.mock('../../../capabilities/check_capabilities', () => ({
  usePermissionCheck: () => [true, true],
}));
jest.mock('../../../contexts/kibana/kibana_context', () => ({
  useMlKibana: () => ({
    services: {
      docLinks: {
        links: {
          ml: { calendars: 'calendars link' },
        },
      },
    },
  }),
}));

describe('CalendarListsHeader', () => {
  const refreshCalendars = jest.fn(() => {});

  const requiredProps = {
    totalCount: 3,
    refreshCalendars,
    kibana: {
      services: {
        docLinks: {
          links: {
            ml: {
              calendars: 'jest-metadata-mock-url',
            },
          },
        },
      },
    },
  };

  test('renders header', async () => {
    const props = {
      ...requiredProps,
      isDst: false,
    };

    const { findByTestId, getByRole, getByTestId, getByText } = renderWithI18n(
      <CalendarsListHeader {...props} />
    );

    expect(getByTestId('appHeaderTitle')).toHaveTextContent('Calendars');
    expect(getByText('3 in total')).toBeInTheDocument();
    await openAppMenuOverflow();
    expect(await findByTestId('mlCalendarListRefreshButton')).toHaveTextContent('Refresh');
    expect(getByRole('link', { name: /^Learn more/ })).toHaveAttribute('href', 'calendars link');
  });
});
