/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { mapRequests } from '../map_requests';
import expect from '@kbn/expect';

describe('Map requests', () => {
  it('flatten ports', () => {
    const requests = { '5603': { total: 1, disconnects: 0, statusCodes: {} } };
    const expected = { total: 1, disconnects: 0 };
    expect(_.isEqual(mapRequests(requests), expected)).to.be(true);
  });

  it('combine values', () => {
    const requests = {
      '5603': { total: 1, disconnects: 0, statusCodes: {} },
      '5604': {
        total: 1,
        disconnects: 44,
        statusCodes: {
          '200': 2,
          '201': 4,
        },
      },
      '5605': {
        total: 1,
        disconnects: 0,
        statusCodes: {
          '200': 20,
        },
      },
    };
    const expected = {
      total: 3,
      disconnects: 44,
    };
    expect(_.isEqual(mapRequests(requests), expected)).to.be(true);
  });
});
