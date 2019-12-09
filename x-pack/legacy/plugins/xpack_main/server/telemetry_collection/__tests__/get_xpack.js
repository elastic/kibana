/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { TIMEOUT } from '../constants';
import {
  getXPackLicense,
  getXPackUsage,
  getXPack,
  handleXPack,
} from '../get_xpack';

function mockGetXPackLicense(callCluster, license, req) {
  callCluster.withArgs(req, 'transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local: 'true'
    }
  })
    .returns(
      license.then(
        response => ({ license: response }),
        () => {} // Catch error so that we don't emit UnhandledPromiseRejectionWarning for tests with invalid license
      )
    );

  callCluster.withArgs('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local: 'true'
    }
  })
    // conveniently wraps the passed in license object as { license: response }, like it really is
    .returns(
      license.then(
        response => ({ license: response }),
        () => {} // Catch error so that we don't emit UnhandledPromiseRejectionWarning for tests with invalid license
      )
    );
}

function mockGetXPackUsage(callCluster, usage, req) {
  callCluster.withArgs(req, 'transport.request', {
    method: 'GET',
    path: '/_xpack/usage',
    query: {
      master_timeout: TIMEOUT
    }
  })
    .returns(usage);

  callCluster.withArgs('transport.request', {
    method: 'GET',
    path: '/_xpack/usage',
    query: {
      master_timeout: TIMEOUT
    }
  })
    .returns(usage);
}

/**
 * Mock getXPack responses.
 *
 * @param {Function} callCluster Sinon function mock.
 * @param {Promise} license Promised license response.
 * @param {Promise} usage Promised usage response.
 * @param {Object} usage reqeust object.
 */
export function mockGetXPack(callCluster, license, usage, req) {
  mockGetXPackLicense(callCluster, license, req);
  mockGetXPackUsage(callCluster, usage, req);
}

describe('get_xpack', () => {

  describe('getXPackLicense', () => {

    it('uses callCluster to get /_license API', async () => {
      const response = { type: 'basic' };
      const callCluster = sinon.stub();

      mockGetXPackLicense(callCluster, Promise.resolve(response));

      expect(await getXPackLicense(callCluster)).to.eql(response);
    });

  });

  describe('getXPackUsage', () => {

    it('uses callCluster to get /_xpack/usage API', () => {
      const response = Promise.resolve({});
      const callCluster = sinon.stub();

      mockGetXPackUsage(callCluster, response);

      expect(getXPackUsage(callCluster)).to.be(response);
    });

  });

  describe('handleXPack', () => {

    it('uses data as expected', () => {
      const license = { fake: 'data' };
      const usage = { also: 'fake', nested: { object: { data: [ { field: 1 }, { field: 2 } ] } } };

      expect(handleXPack(license, usage)).to.eql({ license, stack_stats: { xpack: usage } });
    });

  });

  describe('getXPack', () => {

    it('returns the formatted response object', async () => {
      const license = { fancy: 'license' };
      const xpack = { also: 'fancy' };

      const callCluster = sinon.stub();

      mockGetXPack(callCluster, Promise.resolve(license), Promise.resolve(xpack));

      const data = await getXPack(callCluster);

      expect(data).to.eql({ license, xpack });
    });

    it('returns empty object upon license failure', async () => {
      const callCluster = sinon.stub();

      mockGetXPack(callCluster, Promise.reject(new Error()), Promise.resolve({ also: 'fancy' }));

      const data = await getXPack(callCluster);

      expect(data).to.eql({ });
    });

    it('returns empty object upon usage failure', async () => {
      const callCluster = sinon.stub();

      mockGetXPack(callCluster, Promise.resolve({ fancy: 'license' }), Promise.reject(new Error()));

      const data = await getXPack(callCluster);

      expect(data).to.eql({ });
    });

  });

});
