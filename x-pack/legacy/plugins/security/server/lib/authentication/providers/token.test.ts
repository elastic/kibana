/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors } from 'elasticsearch';
import sinon from 'sinon';
import { requestFixture } from '../../__tests__/__fixtures__/request';
import { LoginAttempt } from '../login_attempt';
import { mockAuthenticationProviderOptions } from './base.mock';
import { TokenAuthenticationProvider } from './token';

describe('TokenAuthenticationProvider', () => {
  let provider: TokenAuthenticationProvider;
  let callWithRequest: sinon.SinonStub;
  let callWithInternalUser: sinon.SinonStub;
  let tokens: ReturnType<typeof mockAuthenticationProviderOptions>['tokens'];
  beforeEach(() => {
    const providerOptions = mockAuthenticationProviderOptions();
    callWithRequest = providerOptions.client.callWithRequest;
    callWithInternalUser = providerOptions.client.callWithInternalUser;
    tokens = providerOptions.tokens;

    provider = new TokenAuthenticationProvider(providerOptions);
  });

  describe('`authenticate` method', () => {
    it('does not redirect AJAX requests that can not be authenticated to the login page.', async () => {
      // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
      // avoid triggering of redirect logic.
      const authenticationResult = await provider.authenticate(
        requestFixture({ headers: { 'kbn-xsrf': 'xsrf' } }),
        null
      );

      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('redirects non-AJAX requests that can not be authenticated to the login page.', async () => {
      const authenticationResult = await provider.authenticate(
        requestFixture({ path: '/some-path # that needs to be encoded', basePath: '/s/foo' }),
        null
      );

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe(
        '/base-path/login?next=%2Fs%2Ffoo%2Fsome-path%20%23%20that%20needs%20to%20be%20encoded'
      );
    });

    it('succeeds with valid login attempt and stores in session', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .resolves({ access_token: 'foo', refresh_token: 'bar' });

      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'foo', refreshToken: 'bar' });
      expect(request.headers.authorization).toEqual(`Bearer foo`);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds if only `authorization` header is available.', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      sinon.assert.calledOnce(callWithRequest);
    });

    it('does not return session state for header-based auth', async () => {
      const authorization = 'Bearer foo';
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.state).toBeUndefined();
    });

    it('succeeds if only state is available.', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = { username: 'user' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      sinon.assert.calledOnce(callWithRequest);
    });

    it('succeeds with valid session even if requiring a token refresh', async () => {
      const user = { username: 'user' };
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'newfoo', refreshToken: 'newbar' });

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer newfoo' } }),
          'shield.authenticate'
        )
        .returns(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toEqual({ accessToken: 'newfoo', refreshToken: 'newbar' });
      expect(request.headers.authorization).toEqual('Bearer newfoo');
    });

    it('does not handle `authorization` header with unsupported schema even if state contains valid credentials.', async () => {
      const request = requestFixture({ headers: { authorization: 'Basic ***' } });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const user = { username: 'user' };
      const authorization = `Bearer ${tokenPair.accessToken}`;

      callWithRequest
        .withArgs(sinon.match({ headers: { authorization } }), 'shield.authenticate')
        .resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.notCalled(callWithRequest);
      expect(request.headers.authorization).toBe('Basic ***');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('authenticates only via `authorization` header even if state is available.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const authorization = `Bearer foo-from-header`;
      const request = requestFixture({ headers: { authorization } });
      const user = { username: 'user' };

      // GetUser will be called with request's `authorization` header.
      callWithRequest.withArgs(request, 'shield.authenticate').resolves(user);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toEqual(user);
      expect(authenticationResult.state).toBeUndefined();
      sinon.assert.calledOnce(callWithRequest);
      expect(request.headers.authorization).toEqual('Bearer foo-from-header');
    });

    it('fails if token cannot be generated during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      const authenticationError = new Error('Invalid credentials');
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.notCalled(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if user cannot be retrieved during login attempt', async () => {
      const request = requestFixture();
      const loginAttempt = new LoginAttempt();
      loginAttempt.setCredentials('user', 'password');
      (request.loginAttempt as sinon.SinonStub).returns(loginAttempt);

      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'password', username: 'user', password: 'password' },
        })
        .resolves({ access_token: 'foo', refresh_token: 'bar' });

      const authenticationError = new Error('Some error');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if authentication with token from header fails with unknown error', async () => {
      const authorization = `Bearer foo`;
      const request = requestFixture({ headers: { authorization } });

      const authenticationError = new errors.InternalServerError('something went wrong');
      callWithRequest.withArgs(request, 'shield.authenticate').rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request);

      sinon.assert.calledOnce(callWithRequest);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if authentication with token from state fails with unknown error.', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };
      const request = requestFixture();

      const authenticationError = new errors.InternalServerError('something went wrong');
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(callWithRequest);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });

    it('fails if token refresh is rejected with unknown error', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      const refreshError = new errors.InternalServerError('failed to refresh token');
      tokens.refresh.withArgs(tokenPair.refreshToken).rejects(refreshError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(refreshError);
    });

    it('redirects non-AJAX requests to /login and clears session if token document is missing', async () => {
      const request = requestFixture({ path: '/some-path' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({
          statusCode: 500,
          body: { error: { reason: 'token document is missing and must be present' } },
        });

      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?next=%2Fsome-path');
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('redirects non-AJAX requests to /login and clears session if token cannot be refreshed', async () => {
      const request = requestFixture({ path: '/some-path' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?next=%2Fsome-path');
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toEqual(null);
      expect(authenticationResult.error).toBeUndefined();
    });

    it('does not redirect AJAX requests if token token cannot be refreshed', async () => {
      const request = requestFixture({ headers: { 'kbn-xsrf': 'xsrf' }, path: '/some-path' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      tokens.refresh.withArgs(tokenPair.refreshToken).resolves(null);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledOnce(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toEqual(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if new access token is rejected after successful refresh', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: `Bearer ${tokenPair.accessToken}` } }),
          'shield.authenticate'
        )
        .rejects({ statusCode: 401 });

      tokens.refresh
        .withArgs(tokenPair.refreshToken)
        .resolves({ accessToken: 'newfoo', refreshToken: 'newbar' });

      const authenticationError = new errors.AuthenticationException('Some error');
      callWithRequest
        .withArgs(
          sinon.match({ headers: { authorization: 'Bearer newfoo' } }),
          'shield.authenticate'
        )
        .rejects(authenticationError);

      const authenticationResult = await provider.authenticate(request, tokenPair);

      sinon.assert.calledTwice(callWithRequest);
      sinon.assert.calledOnce(tokens.refresh);

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toEqual(authenticationError);
    });
  });

  describe('`deauthenticate` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      let deauthenticateResult = await provider.deauthenticate(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.deauthenticate(request, null);
      expect(deauthenticateResult.notHandled()).toBe(true);

      sinon.assert.notCalled(tokens.invalidate);

      deauthenticateResult = await provider.deauthenticate(request, tokenPair);
      expect(deauthenticateResult.notHandled()).toBe(false);
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      tokens.invalidate.withArgs(tokenPair).rejects(failureReason);

      const authenticationResult = await provider.deauthenticate(request, tokenPair);

      sinon.assert.calledOnce(tokens.invalidate);
      sinon.assert.calledWithExactly(tokens.invalidate, tokenPair);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to /login if tokens are invalidated successfully', async () => {
      const request = requestFixture();
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      tokens.invalidate.withArgs(tokenPair).resolves();

      const authenticationResult = await provider.deauthenticate(request, tokenPair);

      sinon.assert.calledOnce(tokens.invalidate);
      sinon.assert.calledWithExactly(tokens.invalidate, tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?msg=LOGGED_OUT');
    });

    it('redirects to /login with optional search parameters if tokens are invalidated successfully', async () => {
      const request = requestFixture({ search: '?yep' });
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      tokens.invalidate.withArgs(tokenPair).resolves();

      const authenticationResult = await provider.deauthenticate(request, tokenPair);

      sinon.assert.calledOnce(tokens.invalidate);
      sinon.assert.calledWithExactly(tokens.invalidate, tokenPair);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/base-path/login?yep');
    });
  });
});
