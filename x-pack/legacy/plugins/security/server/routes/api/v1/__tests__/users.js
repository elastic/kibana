/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import Joi from 'joi';
import sinon from 'sinon';

import { serverFixture } from '../../../../lib/__tests__/__fixtures__/server';
import { requestFixture } from '../../../../lib/__tests__/__fixtures__/request';
import { AuthenticationResult } from '../../../../../../../../plugins/security/server';
import { initUsersApi } from '../users';
import * as ClientShield from '../../../../../../../server/lib/get_client_shield';
import { KibanaRequest } from '../../../../../../../../../src/core/server';

describe('User routes', () => {
  const sandbox = sinon.createSandbox();

  let clusterStub;
  let serverStub;
  let loginStub;

  beforeEach(() => {
    serverStub = serverFixture();
    loginStub = sinon.stub();

    // Cluster is returned by `getClient` function that is wrapped into `once` making cluster
    // a static singleton, so we should use sandbox to set/reset its behavior between tests.
    clusterStub = sinon.stub({ callWithRequest() {} });
    sandbox.stub(ClientShield, 'getClient').returns(clusterStub);

    initUsersApi(
      { authc: { login: loginStub }, config: { authc: { providers: ['basic'] } } },
      serverStub
    );
  });

  afterEach(() => sandbox.restore());

  describe('change password', () => {
    let changePasswordRoute;
    let request;

    beforeEach(() => {
      changePasswordRoute = serverStub.route.withArgs(
        sinon.match({ path: '/api/security/v1/users/{username}/password' })
      ).firstCall.args[0];

      request = requestFixture({
        headers: {},
        auth: { credentials: { username: 'user' } },
        params: { username: 'target-user' },
        payload: { password: 'old-password', newPassword: 'new-password' },
      });
    });

    it('correctly defines route.', async () => {
      expect(changePasswordRoute.method).to.be('POST');
      expect(changePasswordRoute.path).to.be('/api/security/v1/users/{username}/password');
      expect(changePasswordRoute.handler).to.be.a(Function);

      expect(changePasswordRoute.config).to.not.have.property('auth');
      expect(changePasswordRoute.config).to.have.property('pre');
      expect(changePasswordRoute.config.pre).to.have.length(1);
      expect(changePasswordRoute.config.validate).to.eql({
        payload: Joi.object({
          password: Joi.string(),
          newPassword: Joi.string().required(),
        }),
      });
    });

    describe('own password', () => {
      beforeEach(() => {
        request.params.username = request.auth.credentials.username;
        loginStub = loginStub
          .withArgs(sinon.match.instanceOf(KibanaRequest), {
            provider: 'basic',
            value: { username: 'user', password: 'old-password' },
            stateless: true,
          })
          .resolves(AuthenticationResult.succeeded({}));
      });

      it('returns 401 if old password is wrong.', async () => {
        loginStub.resolves(AuthenticationResult.failed(new Error('Something went wrong.')));

        const response = await changePasswordRoute.handler(request);

        sinon.assert.notCalled(clusterStub.callWithRequest);
        expect(response.isBoom).to.be(true);
        expect(response.output.payload).to.eql({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Something went wrong.',
        });
      });

      it('returns 401 if user can authenticate with new password.', async () => {
        loginStub
          .withArgs(sinon.match.instanceOf(KibanaRequest), {
            provider: 'basic',
            value: { username: 'user', password: 'new-password' },
          })
          .resolves(AuthenticationResult.failed(new Error('Something went wrong.')));

        const response = await changePasswordRoute.handler(request);

        sinon.assert.calledOnce(clusterStub.callWithRequest);
        sinon.assert.calledWithExactly(
          clusterStub.callWithRequest,
          sinon.match.same(request),
          'shield.changePassword',
          { username: 'user', body: { password: 'new-password' } }
        );

        expect(response.isBoom).to.be(true);
        expect(response.output.payload).to.eql({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Something went wrong.',
        });
      });

      it('returns 500 if password update request fails.', async () => {
        clusterStub.callWithRequest
          .withArgs(sinon.match.same(request), 'shield.changePassword', {
            username: 'user',
            body: { password: 'new-password' },
          })
          .rejects(new Error('Request failed.'));

        const response = await changePasswordRoute.handler(request);

        expect(response.isBoom).to.be(true);
        expect(response.output.payload).to.eql({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });

      it('successfully changes own password if provided old password is correct.', async () => {
        loginStub
          .withArgs(sinon.match.instanceOf(KibanaRequest), {
            provider: 'basic',
            value: { username: 'user', password: 'new-password' },
          })
          .resolves(AuthenticationResult.succeeded({}));

        const hResponseStub = { code: sinon.stub() };
        const hStub = { response: sinon.stub().returns(hResponseStub) };

        await changePasswordRoute.handler(request, hStub);

        sinon.assert.calledOnce(clusterStub.callWithRequest);
        sinon.assert.calledWithExactly(
          clusterStub.callWithRequest,
          sinon.match.same(request),
          'shield.changePassword',
          { username: 'user', body: { password: 'new-password' } }
        );

        sinon.assert.calledWithExactly(hStub.response);
        sinon.assert.calledWithExactly(hResponseStub.code, 204);
      });
    });

    describe('other user password', () => {
      it('returns 500 if password update request fails.', async () => {
        clusterStub.callWithRequest
          .withArgs(sinon.match.same(request), 'shield.changePassword', {
            username: 'target-user',
            body: { password: 'new-password' },
          })
          .returns(Promise.reject(new Error('Request failed.')));

        const response = await changePasswordRoute.handler(request);

        sinon.assert.notCalled(serverStub.plugins.security.getUser);
        sinon.assert.notCalled(loginStub);

        expect(response.isBoom).to.be(true);
        expect(response.output.payload).to.eql({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });

      it('successfully changes user password.', async () => {
        const hResponseStub = { code: sinon.stub() };
        const hStub = { response: sinon.stub().returns(hResponseStub) };

        await changePasswordRoute.handler(request, hStub);

        sinon.assert.notCalled(serverStub.plugins.security.getUser);
        sinon.assert.notCalled(loginStub);

        sinon.assert.calledOnce(clusterStub.callWithRequest);
        sinon.assert.calledWithExactly(
          clusterStub.callWithRequest,
          sinon.match.same(request),
          'shield.changePassword',
          { username: 'target-user', body: { password: 'new-password' } }
        );

        sinon.assert.calledWithExactly(hStub.response);
        sinon.assert.calledWithExactly(hResponseStub.code, 204);
      });
    });
  });
});
