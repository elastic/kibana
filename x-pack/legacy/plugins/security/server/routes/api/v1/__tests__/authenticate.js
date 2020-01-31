/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import Boom from 'boom';
import Joi from 'joi';
import sinon from 'sinon';

import { serverFixture } from '../../../../lib/__tests__/__fixtures__/server';
import { requestFixture } from '../../../../lib/__tests__/__fixtures__/request';
import {
  AuthenticationResult,
  DeauthenticationResult,
} from '../../../../../../../../plugins/security/server';
import { initAuthenticateApi } from '../authenticate';
import { KibanaRequest } from '../../../../../../../../../src/core/server';

describe('Authentication routes', () => {
  let serverStub;
  let hStub;
  let loginStub;
  let logoutStub;

  beforeEach(() => {
    serverStub = serverFixture();
    hStub = {
      authenticated: sinon.stub(),
      continue: 'blah',
      redirect: sinon.stub(),
      response: sinon.stub(),
    };
    loginStub = sinon.stub();
    logoutStub = sinon.stub();

    initAuthenticateApi(
      {
        authc: { login: loginStub, logout: logoutStub },
        config: { authc: { providers: ['basic'] } },
      },
      serverStub
    );
  });

  describe('login', () => {
    let loginRoute;
    let request;

    beforeEach(() => {
      loginRoute = serverStub.route.withArgs(sinon.match({ path: '/api/security/v1/login' }))
        .firstCall.args[0];

      request = requestFixture({
        headers: {},
        payload: { username: 'user', password: 'password' },
      });
    });

    it('correctly defines route.', async () => {
      expect(loginRoute.method).to.be('POST');
      expect(loginRoute.path).to.be('/api/security/v1/login');
      expect(loginRoute.handler).to.be.a(Function);
      expect(loginRoute.config).to.eql({
        auth: false,
        validate: {
          payload: Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required(),
          }),
        },
        response: {
          emptyStatusCode: 204,
        },
      });
    });

    it('returns 500 if authentication throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      loginStub.throws(unhandledException);

      return loginRoute.handler(request, hStub).catch(response => {
        expect(response.isBoom).to.be(true);
        expect(response.output.payload).to.eql({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        });
      });
    });

    it('returns 401 if authentication fails.', async () => {
      const failureReason = new Error('Something went wrong.');
      loginStub.resolves(AuthenticationResult.failed(failureReason));

      return loginRoute.handler(request, hStub).catch(response => {
        expect(response.isBoom).to.be(true);
        expect(response.message).to.be(failureReason.message);
        expect(response.output.statusCode).to.be(401);
      });
    });

    it('returns 401 if authentication is not handled.', async () => {
      loginStub.resolves(AuthenticationResult.notHandled());

      return loginRoute.handler(request, hStub).catch(response => {
        expect(response.isBoom).to.be(true);
        expect(response.message).to.be('Unauthorized');
        expect(response.output.statusCode).to.be(401);
      });
    });

    describe('authentication succeeds', () => {
      it(`returns user data`, async () => {
        loginStub.resolves(AuthenticationResult.succeeded({ username: 'user' }));

        await loginRoute.handler(request, hStub);

        sinon.assert.calledOnce(hStub.response);
        sinon.assert.calledOnce(loginStub);
        sinon.assert.calledWithExactly(loginStub, sinon.match.instanceOf(KibanaRequest), {
          provider: 'basic',
          value: { username: 'user', password: 'password' },
        });
      });
    });
  });

  describe('logout', () => {
    let logoutRoute;

    beforeEach(() => {
      serverStub.config.returns({
        get: sinon
          .stub()
          .withArgs('server.basePath')
          .returns('/test-base-path'),
      });

      logoutRoute = serverStub.route.withArgs(sinon.match({ path: '/api/security/v1/logout' }))
        .firstCall.args[0];
    });

    it('correctly defines route.', async () => {
      expect(logoutRoute.method).to.be('GET');
      expect(logoutRoute.path).to.be('/api/security/v1/logout');
      expect(logoutRoute.handler).to.be.a(Function);
      expect(logoutRoute.config).to.eql({ auth: false });
    });

    it('returns 500 if deauthentication throws unhandled exception.', async () => {
      const request = requestFixture();

      const unhandledException = new Error('Something went wrong.');
      logoutStub.rejects(unhandledException);

      return logoutRoute.handler(request, hStub).catch(response => {
        expect(response).to.be(Boom.boomify(unhandledException));
        sinon.assert.notCalled(hStub.redirect);
      });
    });

    it('returns 500 if authenticator fails to logout.', async () => {
      const request = requestFixture();

      const failureReason = Boom.forbidden();
      logoutStub.resolves(DeauthenticationResult.failed(failureReason));

      return logoutRoute.handler(request, hStub).catch(response => {
        expect(response).to.be(Boom.boomify(failureReason));
        sinon.assert.notCalled(hStub.redirect);
        sinon.assert.calledOnce(logoutStub);
        sinon.assert.calledWithExactly(logoutStub, sinon.match.instanceOf(KibanaRequest));
      });
    });

    it('returns 400 for AJAX requests that can not handle redirect.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      return logoutRoute.handler(request, hStub).catch(response => {
        expect(response.isBoom).to.be(true);
        expect(response.message).to.be('Client should be able to process redirect response.');
        expect(response.output.statusCode).to.be(400);
        sinon.assert.notCalled(hStub.redirect);
      });
    });

    it('redirects user to the URL returned by authenticator.', async () => {
      const request = requestFixture();

      logoutStub.resolves(DeauthenticationResult.redirectTo('https://custom.logout'));

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, 'https://custom.logout');
    });

    it('redirects user to the base path if deauthentication succeeds.', async () => {
      const request = requestFixture();

      logoutStub.resolves(DeauthenticationResult.succeeded());

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, '/test-base-path/');
    });

    it('redirects user to the base path if deauthentication is not handled.', async () => {
      const request = requestFixture();

      logoutStub.resolves(DeauthenticationResult.notHandled());

      await logoutRoute.handler(request, hStub);

      sinon.assert.calledOnce(hStub.redirect);
      sinon.assert.calledWithExactly(hStub.redirect, '/test-base-path/');
    });
  });

  describe('me', () => {
    let meRoute;

    beforeEach(() => {
      meRoute = serverStub.route.withArgs(sinon.match({ path: '/api/security/v1/me' })).firstCall
        .args[0];
    });

    it('correctly defines route.', async () => {
      expect(meRoute.method).to.be('GET');
      expect(meRoute.path).to.be('/api/security/v1/me');
      expect(meRoute.handler).to.be.a(Function);
      expect(meRoute.config).to.be(undefined);
    });

    it('returns user from the authenticated request property.', async () => {
      const request = { auth: { credentials: { username: 'user' } } };
      const response = await meRoute.handler(request, hStub);

      expect(response).to.eql({ username: 'user' });
    });
  });
});
