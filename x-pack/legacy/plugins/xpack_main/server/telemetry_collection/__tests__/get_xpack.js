/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { TIMEOUT } from '../constants';
import { getXPackUsage } from '../get_xpack';

function mockGetXPackUsage(callCluster, usage, req) {
  callCluster
    .withArgs(req, 'transport.request', {
      method: 'GET',
      path: '/_xpack/usage',
      query: {
        master_timeout: TIMEOUT,
      },
    })
    .returns(usage);

  callCluster
    .withArgs('transport.request', {
      method: 'GET',
      path: '/_xpack/usage',
      query: {
        master_timeout: TIMEOUT,
      },
    })
    .returns(usage);
}

describe('get_xpack', () => {
  describe('getXPackUsage', () => {
    it('uses callCluster to get /_xpack/usage API', () => {
      const response = Promise.resolve({});
      const callCluster = sinon.stub();

      mockGetXPackUsage(callCluster, response);

      expect(getXPackUsage(callCluster)).to.be(response);
    });
  });
});
