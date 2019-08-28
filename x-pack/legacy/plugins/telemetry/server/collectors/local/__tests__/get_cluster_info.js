/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { getClusterInfo } from '../get_cluster_info';

export function mockGetClusterInfo(callCluster, clusterInfo, req) {
  callCluster.withArgs(req, 'info').returns(clusterInfo);
  callCluster.withArgs('info').returns(clusterInfo);
}

describe('get_cluster_info', () => {

  it('uses callCluster to get info API', () => {
    const callCluster = sinon.stub();
    const response = Promise.resolve({});

    mockGetClusterInfo(callCluster, response);

    expect(getClusterInfo(callCluster)).to.be(response);
  });

});
