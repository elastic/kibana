/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import Joi from 'joi';

import { serverFixture } from '../../../../lib/__tests__/__fixtures__/server';
import { requestFixture } from '../../../../lib/__tests__/__fixtures__/request';
import { initApiKeysApi } from '../api_keys';
import * as ClientShield from '../../../../../../../server/lib/get_client_shield';

describe('API Keys routes', () => {
  const sandbox = sinon.createSandbox();

  let clusterStub;
  let serverStub;

  beforeEach(() => {
    serverStub = serverFixture();

    clusterStub = sinon.stub({ callWithRequest() { } });
    sandbox.stub(ClientShield, 'getClient').returns(clusterStub);

    initApiKeysApi(serverStub);
  });

  afterEach(() => sandbox.restore());

  describe('privileges', () => {
    let privilegesRoute;
    let request;

    const MOCK_PRIVILEGES_RESPONSE = {
      username: 'elastic',
      has_all_requested: true,
      cluster: { manage_api_key: true, manage_security: true },
      index: {},
      application: {},
    };

    const MOCK_API_KEYS_RESPONSE = {
      api_keys:
        [{
          id: 'YCLV7m0BJ3xI4hhWB648',
          name: 'my-api-key2',
          creation: 1571670001452,
          expiration: 1571756401452,
          invalidated: false,
          username: 'elastic',
          realm: 'reserved'
        }]
    };

    beforeEach(() => {
      privilegesRoute = serverStub.route
        .withArgs(sinon.match({ path: '/internal/security/api_key/privileges' }))
        .firstCall
        .args[0];

      request = requestFixture({
        headers: {},
      });
    });

    it('correctly defines the route', () => {
      expect(privilegesRoute.method).to.be('GET');
      expect(privilegesRoute.path).to.be('/internal/security/api_key/privileges');
      expect(privilegesRoute.handler).to.be.a(Function);
      expect(privilegesRoute.config).to.have.property('pre');
      expect(privilegesRoute.config.pre).to.have.length(1);
    });

    it('returns areApiKeysEnabled and isAdmin', async () => {
      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.hasPrivileges',
        )
        .resolves(MOCK_PRIVILEGES_RESPONSE);

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.getAPIKeys',
        )
        .resolves(MOCK_API_KEYS_RESPONSE);

      const privilegesResponse = await privilegesRoute.handler(request);

      expect(privilegesResponse.hasOwnProperty('areApiKeysEnabled')).to.be(true);
      expect(privilegesResponse.hasOwnProperty('isAdmin')).to.be(true);
    });


    it('sets areApiKeysEnabled to false if API keys are disabled', async () => {
      const apiKeysDisabledError = new Error('api keys are not enabled');

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.hasPrivileges',
        )
        .resolves(MOCK_PRIVILEGES_RESPONSE);

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.getAPIKeys',
        )
        .resolves(apiKeysDisabledError);

      const { areApiKeysEnabled } = await privilegesRoute.handler(request);

      expect(areApiKeysEnabled).to.be(true);
    });

    it('sets isAdmin to true if a user has the manage_security or manage_api_key privilege', async () => {
      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.hasPrivileges',
        )
        .resolves(MOCK_PRIVILEGES_RESPONSE);

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.getAPIKeys',
        )
        .resolves(MOCK_API_KEYS_RESPONSE);

      const { isAdmin } = await privilegesRoute.handler(request);

      expect(isAdmin).to.be(true);
    });

    it('sets isAdmin to false if a user does not have the manage_security or manage_api_key privilege', async () => {
      const nonAdminResponse = {
        ...MOCK_PRIVILEGES_RESPONSE,
        cluster: { manage_api_key: false, manage_security: false },
      };

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.hasPrivileges',
        )
        .resolves(nonAdminResponse);

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.getAPIKeys',
        )
        .resolves(MOCK_API_KEYS_RESPONSE);

      const { isAdmin } = await privilegesRoute.handler(request);

      expect(isAdmin).to.be(false);
    });
  });

  describe('invalidate', () => {
    let invalidateRoute;
    let request;

    const MOCK_INVALIDATE_API_KEYS = [
      { name: 'my-api-key1', id: 'YCLV7m0BJ3xI4hhWB648' },
      { name: 'my-api-key2', id: 'ABCD7m0BJ3xI4hhWB648' }
    ];

    beforeEach(() => {
      invalidateRoute = serverStub.route
        .withArgs(sinon.match({ path: '/internal/security/api_key/invalidate' }))
        .firstCall
        .args[0];

      request = requestFixture({
        headers: {},
        payload: {
          apiKeys: MOCK_INVALIDATE_API_KEYS,
          isAdmin: true
        }
      });
    });

    it('correctly defines the route', () => {
      expect(invalidateRoute.method).to.be('POST');
      expect(invalidateRoute.path).to.be('/internal/security/api_key/invalidate');
      expect(invalidateRoute.handler).to.be.a(Function);

      expect(invalidateRoute.config).to.have.property('pre');
      expect(invalidateRoute.config.pre).to.have.length(1);
      expect(invalidateRoute.config.validate).to.eql({
        payload: Joi.object({
          apiKeys: Joi.array().items(Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
          })).required(),
          isAdmin: Joi.bool().required(),
        })
      });
    });

    it('invalidates all provided keys', async () => {
      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.invalidateAPIKey',
        )
        .resolves();

      const { itemsInvalidated, errors } = await invalidateRoute.handler(request);

      expect(itemsInvalidated).to.have.length(MOCK_INVALIDATE_API_KEYS.length);
      expect(errors).to.have.length(0);
    });

    it('returns a list of errors encountered when trying to invalidate each key', async () => {
      const error = new Error('Something went wrong.');

      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.invalidateAPIKey',
        )
        .rejects(error);

      const { itemsInvalidated, errors } = await invalidateRoute.handler(request);

      expect(itemsInvalidated).to.have.length(0);
      expect(errors).to.have.length(2);
    });
  });

  describe('get', () => {
    let getRoute;
    let request;

    beforeEach(() => {
      getRoute = serverStub.route
        .withArgs(sinon.match({ path: '/internal/security/api_key' }))
        .firstCall
        .args[0];

      request = requestFixture({
        headers: {},
      });
    });

    it('correctly defines the route', () => {
      expect(getRoute.method).to.be('GET');
      expect(getRoute.path).to.be('/internal/security/api_key');
      expect(getRoute.handler).to.be.a(Function);

      expect(getRoute.config).to.have.property('pre');
      expect(getRoute.config.pre).to.have.length(1);
      expect(getRoute.config.validate).to.eql({
        query: Joi.object().keys({
          isAdmin: Joi.bool().required(),
        }).required(),
      });
    });

    it('only returns valid keys', async () => {
      const MOCK_API_KEYS_WITH_INVALIDATED_RESPONSE = {
        api_keys:
          [{
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'my-api-key1',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: false,
            username: 'elastic',
            realm: 'reserved'
          },
          {
            id: 'ABCD7m0BJ3xI4hhWB648',
            name: 'my-api-key2',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: true,
            username: 'elastic',
            realm: 'reserved'
          }]
      };
      clusterStub.callWithRequest
        .withArgs(
          sinon.match.same(request),
          'shield.getAPIKeys',
        )
        .resolves(MOCK_API_KEYS_WITH_INVALIDATED_RESPONSE);

      const { apiKeys } = await getRoute.handler(request);
      expect(apiKeys).to.have.length(1);
    });
  });
});
