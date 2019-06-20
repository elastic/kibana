/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors } from 'elasticsearch';
import sinon from 'sinon';

import { Tokens } from './tokens';

describe('Tokens', () => {
  let tokens: Tokens;
  let callWithInternalUser: sinon.SinonStub;
  beforeEach(() => {
    const client = { callWithRequest: sinon.stub(), callWithInternalUser: sinon.stub() };
    const tokensOptions = { client, log: sinon.stub() };
    callWithInternalUser = tokensOptions.client.callWithInternalUser as sinon.SinonStub;

    tokens = new Tokens(tokensOptions);
  });

  it('isAccessTokenExpiredError() returns `true` only if token expired or its document is missing', () => {
    for (const error of [
      {},
      new Error(),
      Boom.serverUnavailable(),
      Boom.forbidden(),
      new errors.InternalServerError(),
      new errors.Forbidden(),
      {
        statusCode: 500,
        body: { error: { reason: 'some unknown reason' } },
      },
    ]) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(false);
    }

    for (const error of [
      { statusCode: 401 },
      Boom.unauthorized(),
      new errors.AuthenticationException(),
      {
        statusCode: 500,
        body: { error: { reason: 'token document is missing and must be present' } },
      },
    ]) {
      expect(Tokens.isAccessTokenExpiredError(error)).toBe(true);
    }
  });

  describe('refresh()', () => {
    const refreshToken = 'some-refresh-token';

    it('throws if API call fails with unknown reason', async () => {
      const refreshFailureReason = Boom.serverUnavailable('Server is not available');
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: refreshToken },
        })
        .rejects(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).rejects.toBe(refreshFailureReason);
    });

    it('returns `null` if refresh token is not valid', async () => {
      const refreshFailureReason = Boom.badRequest();
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: refreshToken },
        })
        .rejects(refreshFailureReason);

      await expect(tokens.refresh(refreshToken)).resolves.toBe(null);
    });

    it('returns token pair if refresh API call succeeds', async () => {
      const tokenPair = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      callWithInternalUser
        .withArgs('shield.getAccessToken', {
          body: { grant_type: 'refresh_token', refresh_token: refreshToken },
        })
        .resolves({ access_token: tokenPair.accessToken, refresh_token: tokenPair.refreshToken });

      await expect(tokens.refresh(refreshToken)).resolves.toEqual(tokenPair);
    });
  });

  describe('invalidate()', () => {
    it('throws if call to delete access token responds with an error', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      callWithInternalUser
        .withArgs('shield.deleteAccessToken', { body: { token: tokenPair.accessToken } })
        .rejects(failureReason);

      callWithInternalUser
        .withArgs('shield.deleteAccessToken', { body: { refresh_token: tokenPair.refreshToken } })
        .resolves({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

      sinon.assert.calledTwice(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('throws if call to delete refresh token responds with an error', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      const failureReason = new Error('failed to delete token');
      callWithInternalUser
        .withArgs('shield.deleteAccessToken', { body: { refresh_token: tokenPair.refreshToken } })
        .rejects(failureReason);

      callWithInternalUser
        .withArgs('shield.deleteAccessToken', { body: { token: tokenPair.accessToken } })
        .resolves({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).rejects.toBe(failureReason);

      sinon.assert.calledTwice(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('invalidates all provided tokens', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      sinon.assert.calledTwice(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('invalidates only access token if only access token is provided', async () => {
      const tokenPair = { accessToken: 'foo' };

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
    });

    it('invalidates only refresh token if only refresh token is provided', async () => {
      const tokenPair = { refreshToken: 'foo' };

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 1 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      sinon.assert.calledOnce(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('does not fail if none of the tokens were invalidated', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 0 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      sinon.assert.calledTwice(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });

    it('does not fail if more than one token per access or refresh token were invalidated', async () => {
      const tokenPair = { accessToken: 'foo', refreshToken: 'bar' };

      callWithInternalUser.withArgs('shield.deleteAccessToken').resolves({ invalidated_tokens: 5 });

      await expect(tokens.invalidate(tokenPair)).resolves.toBe(undefined);

      sinon.assert.calledTwice(callWithInternalUser);
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { token: tokenPair.accessToken },
      });
      sinon.assert.calledWithExactly(callWithInternalUser, 'shield.deleteAccessToken', {
        body: { refresh_token: tokenPair.refreshToken },
      });
    });
  });
});
