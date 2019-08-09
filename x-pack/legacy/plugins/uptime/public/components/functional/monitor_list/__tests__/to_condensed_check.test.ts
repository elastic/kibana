/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Check } from '../../../../../common/graphql/types';
import { toCondensedCheck } from '../to_condensed_check';

describe('toCondensedCheck', () => {
  let checks: Check[];
  beforeEach(() => {
    checks = [
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '123',
        monitor: {
          ip: '192.178.123.21',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '124',
        monitor: {
          ip: '192.178.123.22',
          status: 'down',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '113',
        monitor: {
          ip: '192.178.123.23',
          status: 'up',
        },
      },
    ];
  });

  it('condenses checks across location', () => {
    expect(toCondensedCheck(checks)).toMatchSnapshot();
  });

  it('infers an "up" status for a series of "up" checks', () => {
    checks = [
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '123',
        monitor: {
          ip: '192.178.123.21',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '124',
        monitor: {
          ip: '192.178.123.22',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '113',
        monitor: {
          ip: '192.178.123.23',
          status: 'up',
        },
      },
    ];
    const result = toCondensedCheck(checks);
    expect(result).toMatchSnapshot();
  });

  it('creates the correct number of condensed checks for multiple locations', () => {
    checks = [
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '123',
        monitor: {
          ip: '192.178.123.21',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '124',
        monitor: {
          ip: '192.178.123.22',
          status: 'down',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-east-1',
          },
        },
        timestamp: '113',
        monitor: {
          ip: '192.178.123.23',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-west-1',
          },
        },
        timestamp: '121',
        monitor: {
          ip: '192.178.123.21',
          status: 'up',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-west-1',
          },
        },
        timestamp: '132',
        monitor: {
          ip: '192.178.123.22',
          status: 'down',
        },
      },
      {
        observer: {
          geo: {
            name: 'us-west-1',
          },
        },
        timestamp: '115',
        monitor: {
          ip: '192.178.123.23',
          status: 'up',
        },
      },
    ];
    const result = toCondensedCheck(checks);
    expect(result).toMatchSnapshot();
  });
});
