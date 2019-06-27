/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { requestFixture } from '../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../login_attempt';
import { mockAuthenticationProviderOptions } from './base.mock';

import { KerberosAuthenticationProvider } from './kerberos';

describe('KerberosAuthenticationProvider', () => {
  let provider: KerberosAuthenticationProvider;
  let callWithRequest: sinon.SinonStub;
  let callWithInternalUser: sinon.SinonStub;
  beforeEach(() => {
    const providerOptions = mockAuthenticationProviderOptions();
    callWithRequest = providerOptions.client.callWithRequest as sinon.SinonStub;
    callWithInternalUser = providerOptions.client.callWithInternalUser as sinon.SinonStub;

    provider = new KerberosAuthenticationProvider(providerOptions);
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic some:credentials' } });

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
      });

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests with non-empty `loginAttempt`.', async () => {
      const request = requestFixture();

      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
      });

      sinon.assert.notCalled(callWithRequest);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests that can be authenticated without `Negotiate` header.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').resolves({});

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests if backend does not support Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.unauthorized());
      let authenticationResult = await provider.authenticate(request, null);
      expect(authenticationResult.notHandled()).toBe(true);

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Basic'));
      authenticationResult = await provider.authenticate(request, null);
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('fails if state is present, but backend does not support Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.unauthorized());

      let authenticationResult = await provider.authenticate(request, { accessToken: 'token' });
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toBeUndefined();

      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Basic'));

      authenticationResult = await provider.authenticate(request, { accessToken: 'token' });
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('fails with `Negotiate` challenge if backend supports Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest
        .withArgs(request, 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Negotiate'));

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('fails if request authentication is failed with non-401 error.', async () => {
      const request = requestFixture();
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(Boom.serverUnavailable());

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 503);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('gets an access token in exchange to SPNEGO one and stores it in the state.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer some-token' } }),
          'shield.authenticate'
        )
        .resolves(user);

      callWithRequest
        .withArgs(request, 'shield.getAccessToken')
        .resolves({ access_token: 'some-token' });

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithRequest, request, 'shield.getAccessToken', {
        body: { grant_type: 'client_credentials' },
      });

      expect(request.headers.authorization).toBe('Bearer some-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'some-token' });
    });

    it('fails if could not retrieve an access token in exchange to SPNEGO one.', async () => {
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      const failureReason = Boom.unauthorized();
      callWithRequest.withArgs(request, 'shield.getAccessToken').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithRequest, request, 'shield.getAccessToken', {
        body: { grant_type: 'client_credentials' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = requestFixture({ headers: { authorization: 'negotiate spnego' } });

      const failureReason = Boom.unauthorized();
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer some-token' } }),
          'shield.authenticate'
        )
        .rejects(failureReason);

      callWithRequest
        .withArgs(request, 'shield.getAccessToken')
        .resolves({ access_token: 'some-token' });

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledWithExactly(callWithRequest, request, 'shield.getAccessToken', {
        body: { grant_type: 'client_credentials' },
      });

      expect(request.headers.authorization).toBe('negotiate spnego');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.challenges).toBeUndefined();
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture();

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
      });

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = requestFixture();

      const failureReason = Boom.internal('Token is not valid!');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-invalid-token',
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      sinon.assert.neverCalledWith(callWithRequest, 'shield.getAccessToken');
    });

    it('fails with `Negotiate` challenge if token from the state is expired and backend supports Kerberos.', async () => {
      const request = requestFixture();
      callWithRequest.rejects(Boom.unauthorized(null, 'Negotiate'));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'expired-token',
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('fails with `Negotiate` challenge if access token document is missing and backend supports Kerberos.', async () => {
      const request = requestFixture({ headers: {} });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer expired-token' } }),
          'shield.authenticate'
        )
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        })
        .withArgs(sinon.match({ headers: {} }), 'shield.authenticate')
        .rejects(Boom.unauthorized(null, 'Negotiate'));

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'missing-token',
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('output.statusCode', 401);
      expect(authenticationResult.challenges).toEqual(['Negotiate']);
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-valid-token' } });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = { username: 'user' };
      const request = requestFixture({ headers: { authorization: 'Bearer some-invalid-token' } });

      const failureReason = { statusCode: 401 };
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(failureReason);

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization: 'Bearer some-valid-token' } }))
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, {
        accessToken: 'some-valid-token',
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = requestFixture();

      let deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, {} as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, { somethingElse: 'x' } as any);
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(callWithInternalUser);
    });

    it('fails if `deleteAccessToken` call fails.', async () => {
      const request = requestFixture();
      const accessToken = 'x-access-token';

      const failureReason = new Error('Unknown error');
      callWithInternalUser.withArgs('shield.deleteAccessToken').rejects(failureReason);

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: accessToken },
      });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('invalidates access token and redirects to `/logged_out` page.', async () => {
      const request = requestFixture();
      const accessToken = 'x-access-token';

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 1 });

      const authenticationResult = await provider.deauthenticate(request, {
        accessToken,
      });

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: accessToken },
      });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/logged_out');
    });
  });
});
