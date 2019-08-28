/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { callClusterFactory } from '../call_cluster_factory';

describe('callClusterFactory', () => {

  let mockServer;
  let mockCluster;

  beforeEach(() => {
    mockCluster = {
      callWithRequest: sinon.stub().returns(Promise.resolve({ hits: { total: 0 } })),
      callWithInternalUser: sinon.stub().returns(Promise.resolve({ hits: { total: 0 } })),
    };
    mockServer = {
      plugins: {
        elasticsearch: { getCluster: sinon.stub().withArgs('admin').returns(mockCluster) }
      },
      log() {},
    };
  });

  it('returns an object with getter methods', () => {
    const _callClusterFactory = callClusterFactory(mockServer);
    expect(_callClusterFactory).to.be.an('object');
    expect(_callClusterFactory.getCallClusterWithReq).to.be.an('function');
    expect(_callClusterFactory.getCallClusterInternal).to.be.an('function');
    expect(mockCluster.callWithRequest.called).to.be(false);
    expect(mockCluster.callWithInternalUser.called).to.be(false);
  });

  describe('getCallClusterWithReq', () => {
    it('throws an error if req is not passed', async () => {
      const runCallCluster = () => callClusterFactory(mockServer).getCallClusterWithReq();
      expect(runCallCluster).to.throwException();
    });

    it('returns a method that wraps callWithRequest', async () => {
      const mockReq = {
        headers: {
          authorization: 'Basic dSQzcm5AbTM6cEAkJHcwcmQ=' // u$3rn@m3:p@$$w0rd
        }
      };
      const callCluster = callClusterFactory(mockServer).getCallClusterWithReq(mockReq);

      const result = await callCluster('search', { body: { match: { match_all: {} } } });
      expect(result).to.eql({ hits: { total: 0 } });

      expect(mockCluster.callWithInternalUser.called).to.be(false);
      expect(mockCluster.callWithRequest.calledOnce).to.be(true);
      const [ req, method ] = mockCluster.callWithRequest.getCall(0).args;
      expect(req).to.be(mockReq);
      expect(method).to.be('search');
    });
  });

  describe('getCallClusterInternal', () => {
    it('returns a method that wraps callWithInternalUser', async () => {
      const callCluster = callClusterFactory(mockServer).getCallClusterInternal();

      const result = await callCluster('search', { body: { match: { match_all: {} } } });
      expect(result).to.eql({ hits: { total: 0 } });

      expect(mockCluster.callWithRequest.called).to.be(false);
      expect(mockCluster.callWithInternalUser.calledOnce).to.be(true);
      const [ method ] = mockCluster.callWithInternalUser.getCall(0).args;
      expect(method).to.eql('search');
    });
  });
});
