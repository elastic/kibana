/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CalendarsListHeader } from './header';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));
jest.mock('@kbn/ml-hooks/capabilities/use_permission_check', () => ({
  usePermissionCheck: () => [true, true],
}));
jest.mock('@kbn/ml-kibana-context/kibana_context', () => ({
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

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const { container } = renderWithI18n(<CalendarsListHeader {...props} />);

    expect(container).toMatchSnapshot();
  });
});
