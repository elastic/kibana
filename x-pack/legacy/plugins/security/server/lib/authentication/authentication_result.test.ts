/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { AuthenticatedUser } from '../../../common/model';
import { AuthenticationResult } from './authentication_result';

describe('AuthenticationResult', () => {
  describe('notHandled', () => {
    it('correctly produces `notHandled` authentication result.', () => {
      const authenticationResult = AuthenticationResult.notHandled();

      expect(authenticationResult.notHandled()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('failed', () => {
    it('fails if error is not specified.', () => {
      expect(() => AuthenticationResult.failed(undefined as any)).toThrowError(
        'Error should be specified.'
      );
    });

    it('correctly produces `failed` authentication result.', () => {
      const failureReason = new Error('Something went wrong.');
      const authenticationResult = AuthenticationResult.failed(failureReason);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });

    it('can provide `challenges` for `401` errors', () => {
      const failureReason = Boom.unauthorized();
      const authenticationResult = AuthenticationResult.failed(failureReason, ['Negotiate']);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.challenges).toEqual(['Negotiate']);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });

    it('can not provide `challenges` for non-`401` errors', () => {
      expect(() => AuthenticationResult.failed(Boom.badRequest(), ['Negotiate'])).toThrowError(
        'Challenges can only be provided with `401 Unauthorized` errors.'
      );
    });
  });

  describe('succeeded', () => {
    it('fails if user is not specified.', () => {
      expect(() => AuthenticationResult.succeeded(undefined as any)).toThrowError(
        'User should be specified.'
      );
    });

    it('correctly produces `succeeded` authentication result without state.', () => {
      const user = { username: 'user' } as AuthenticatedUser;
      const authenticationResult = AuthenticationResult.succeeded(user);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });

    it('correctly produces `succeeded` authentication result with state.', () => {
      const user = { username: 'user' } as AuthenticatedUser;
      const state = { some: 'state' };
      const authenticationResult = AuthenticationResult.succeeded(user, state);

      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);
      expect(authenticationResult.redirected()).toBe(false);

      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBe(state);
      expect(authenticationResult.error).toBeUndefined();
      expect(authenticationResult.redirectURL).toBeUndefined();
    });
  });

  describe('redirectTo', () => {
    it('fails if redirect URL is not specified.', () => {
      expect(() => AuthenticationResult.redirectTo(undefined as any)).toThrowError(
        'Redirect URL must be specified.'
      );
    });

    it('correctly produces `redirected` authentication result without state.', () => {
      const redirectURL = '/redirect/url';
      const authenticationResult = AuthenticationResult.redirectTo(redirectURL);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);

      expect(authenticationResult.redirectURL).toBe(redirectURL);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.state).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
    });

    it('correctly produces `redirected` authentication result with state.', () => {
      const redirectURL = '/redirect/url';
      const state = { some: 'state' };
      const authenticationResult = AuthenticationResult.redirectTo(redirectURL, state);

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.succeeded()).toBe(false);
      expect(authenticationResult.failed()).toBe(false);
      expect(authenticationResult.notHandled()).toBe(false);

      expect(authenticationResult.redirectURL).toBe(redirectURL);
      expect(authenticationResult.state).toBe(state);
      expect(authenticationResult.user).toBeUndefined();
      expect(authenticationResult.error).toBeUndefined();
    });
  });

  describe('shouldUpdateState', () => {
    it('always `false` for `failed`', () => {
      expect(AuthenticationResult.failed(new Error('error')).shouldUpdateState()).toBe(false);
    });

    it('always `false` for `notHandled`', () => {
      expect(AuthenticationResult.notHandled().shouldUpdateState()).toBe(false);
    });

    it('depends on `state` for `redirected`.', () => {
      const mockURL = 'some-url';
      expect(AuthenticationResult.redirectTo(mockURL, 'string').shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.redirectTo(mockURL, 0).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.redirectTo(mockURL, true).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.redirectTo(mockURL, false).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.redirectTo(mockURL, { prop: 'object' }).shouldUpdateState()).toBe(
        true
      );
      expect(AuthenticationResult.redirectTo(mockURL, { prop: 'object' }).shouldUpdateState()).toBe(
        true
      );

      expect(AuthenticationResult.redirectTo(mockURL).shouldUpdateState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, undefined).shouldUpdateState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, null).shouldUpdateState()).toBe(false);
    });

    it('depends on `state` for `succeeded`.', () => {
      const mockUser = { username: 'u' } as AuthenticatedUser;
      expect(AuthenticationResult.succeeded(mockUser, 'string').shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.succeeded(mockUser, 0).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.succeeded(mockUser, true).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.succeeded(mockUser, false).shouldUpdateState()).toBe(true);
      expect(AuthenticationResult.succeeded(mockUser, { prop: 'object' }).shouldUpdateState()).toBe(
        true
      );
      expect(AuthenticationResult.succeeded(mockUser, { prop: 'object' }).shouldUpdateState()).toBe(
        true
      );

      expect(AuthenticationResult.succeeded(mockUser).shouldUpdateState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, undefined).shouldUpdateState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, null).shouldUpdateState()).toBe(false);
    });
  });

  describe('shouldClearState', () => {
    it('always `false` for `failed`', () => {
      expect(AuthenticationResult.failed(new Error('error')).shouldClearState()).toBe(false);
    });

    it('always `false` for `notHandled`', () => {
      expect(AuthenticationResult.notHandled().shouldClearState()).toBe(false);
    });

    it('depends on `state` for `redirected`.', () => {
      const mockURL = 'some-url';
      expect(AuthenticationResult.redirectTo(mockURL, null).shouldClearState()).toBe(true);

      expect(AuthenticationResult.redirectTo(mockURL).shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, undefined).shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, 'string').shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, 0).shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, true).shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, false).shouldClearState()).toBe(false);
      expect(AuthenticationResult.redirectTo(mockURL, { prop: 'object' }).shouldClearState()).toBe(
        false
      );
      expect(AuthenticationResult.redirectTo(mockURL, { prop: 'object' }).shouldClearState()).toBe(
        false
      );
    });

    it('depends on `state` for `succeeded`.', () => {
      const mockUser = { username: 'u' } as AuthenticatedUser;
      expect(AuthenticationResult.succeeded(mockUser, null).shouldClearState()).toBe(true);

      expect(AuthenticationResult.succeeded(mockUser).shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, undefined).shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, 'string').shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, 0).shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, true).shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, false).shouldClearState()).toBe(false);
      expect(AuthenticationResult.succeeded(mockUser, { prop: 'object' }).shouldClearState()).toBe(
        false
      );
      expect(AuthenticationResult.succeeded(mockUser, { prop: 'object' }).shouldClearState()).toBe(
        false
      );
    });
  });
});
