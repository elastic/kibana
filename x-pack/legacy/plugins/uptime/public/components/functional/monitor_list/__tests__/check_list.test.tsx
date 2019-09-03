/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import moment from 'moment';
import React from 'react';
import { Check } from '../../../../../common/graphql/types';
import { CheckList } from '../check_list';

describe('CheckList component', () => {
  let checks: Check[];

  beforeAll(() => {
    moment.prototype.toLocaleString = jest.fn(() => '2019-06-21 15:29:26');
    moment.prototype.from = jest.fn(() => 'a few moments ago');
  });

  beforeEach(() => {
    checks = [
      {
        monitor: {
          ip: '127.0.0.1',
          status: 'up',
        },
        timestamp: '123',
      },
      {
        monitor: {
          ip: '127.0.0.2',
          status: 'up',
        },
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: 'up',
      },
    ];
  });

  it('renders a list of checks', () => {
    const component = shallowWithIntl(<CheckList checks={checks} />);
    expect(component).toMatchSnapshot();
  });
});
