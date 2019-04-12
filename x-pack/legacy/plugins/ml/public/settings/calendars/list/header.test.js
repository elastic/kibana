/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { CalendarsListHeader } from './header';

describe('CalendarListsHeader', () => {

  const refreshCalendars = jest.fn(() => {});

  const requiredProps = {
    totalCount: 3,
    refreshCalendars,
  };

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const component = shallowWithIntl(
      <CalendarsListHeader {...props} />
    );

    expect(component).toMatchSnapshot();

  });

});
