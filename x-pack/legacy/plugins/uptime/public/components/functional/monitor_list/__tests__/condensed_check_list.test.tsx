/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import moment from 'moment';
import { CondensedCheck } from '../types';
import { CondensedCheckList } from '../condensed_check_list';

describe('CondensedCheckList component', () => {
  let checks: CondensedCheck[];

  beforeAll(() => {
    moment.prototype.toLocaleString = jest.fn(() => '2019-06-21 15:29:26');
    moment.prototype.from = jest.fn(() => 'a few moments ago');
  });

  beforeEach(() => {
    checks = [
      {
        childStatuses: [
          {
            ip: '127.0.0.1',
            status: 'up',
            timestamp: '123',
          },
          {
            ip: '127.0.0.2',
            status: 'down',
            timestamp: '122',
          },
        ],
        location: 'us-east-1',
        status: 'mixed',
        timestamp: '123',
      },
      {
        childStatuses: [
          {
            ip: '127.0.0.1',
            status: 'up',
            timestamp: '120',
          },
          {
            ip: '127.0.0.2',
            status: 'up',
            timestamp: '121',
          },
        ],
        location: 'us-west-1',
        status: 'up',
        timestamp: '125',
      },
    ];
  });

  it('renders checks', () => {
    const component = shallowWithIntl(
      <CondensedCheckList dangerColor="danger" successColor="primary" condensedChecks={checks} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders null in place of child status with missing ip', () => {
    checks[0].childStatuses[0].ip = undefined;
    const component = shallowWithIntl(
      <CondensedCheckList dangerColor="danger" successColor="primary" condensedChecks={checks} />
    );
    expect(component).toMatchSnapshot();
  });
});
