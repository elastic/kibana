/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents status that `AuthenticationResult` can be in.
 */
import { AuthenticatedUser } from '../../../common/model';
import { getErrorStatusCode } from '../errors';

enum AuthenticationResultStatus {
  /**
   * Authentication of the user can't be handled (e.g. supported credentials
   * are not provided).
   */
  NotHandled = 'not-handled',

  /**
   * User has been successfully authenticated. Result should be complemented
   * with retrieved user information and optionally with state.
   */
  Succeeded = 'succeeded',

  /**
   * User can't be authenticated with the provided credentials. Result should
   * include the error that describes the reason of failure.
   */
  Failed = 'failed',

  /**
   * Authentication consists of multiple steps and user should be redirected to
   * a different location to complete it. Can be complemented with optional state.
   */
  Redirected = 'redirected',
}

/**
 * Represents additional authentication options.
 */
interface AuthenticationOptions {
  error?: Error;
  challenges?: string[];
  redirectURL?: string;
  state?: unknown;
  user?: AuthenticatedUser;
}

/**
 * Represents the result of an authentication attempt.
 */
export class AuthenticationResult {
  /**
   * Produces `AuthenticationResult` for the case when user can't be authenticated with the
   * provided credentials.
   */
  public static notHandled() {
    return new AuthenticationResult(AuthenticationResultStatus.NotHandled);
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication succeeds.
   * @param user User information retrieved as a result of successful authentication attempt.
   * @param [state] Optional state to be stored and reused for the next request.
   */
  public static succeeded(user: AuthenticatedUser, state?: unknown) {
    if (!user) {
      throw new Error('User should be specified.');
    }

    return new AuthenticationResult(AuthenticationResultStatus.Succeeded, { user, state });
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication fails.
   * @param error Error that occurred during authentication attempt.
   * @param [challenges] Optional list of the challenges that will be returned to the user within
   * `WWW-Authenticate` HTTP header. Multiple challenges will result in multiple headers (one per
   * challenge) as it's better supported by the browsers than comma separated list within a single
   * header. Challenges can only be set for errors with `401` error status.
   */
  public static failed(error: Error, challenges?: string[]) {
    if (!error) {
      throw new Error('Error should be specified.');
    }

    if (challenges != null && getErrorStatusCode(error) !== 401) {
      throw new Error('Challenges can only be provided with `401 Unauthorized` errors.');
    }

    return new AuthenticationResult(AuthenticationResultStatus.Failed, { error, challenges });
  }

  /**
   * Produces `AuthenticationResult` for the case when authentication needs user to be redirected.
   * @param redirectURL URL that should be used to redirect user to complete authentication.
   * @param [state] Optional state to be stored and reused for the next request.
   */
  public static redirectTo(redirectURL: string, state?: unknown) {
    if (!redirectURL) {
      throw new Error('Redirect URL must be specified.');
    }

    return new AuthenticationResult(AuthenticationResultStatus.Redirected, { redirectURL, state });
  }

  /**
   * Authenticated user instance (only available for `succeeded` result).
   */
  public get user() {
    return this.options.user;
  }

  /**
   * State associated with the authenticated user (only available for `succeeded`
   * and `redirected` results).
   */
  public get state() {
    return this.options.state;
  }

  /**
   * Error that occurred during authentication (only available for `failed` result).
   */
  public get error() {
    return this.options.error;
  }

  /**
   * Challenges that need to be sent to the user within `WWW-Authenticate` HTTP header.
   */
  public get challenges() {
    return this.options.challenges;
  }

  /**
   * URL that should be used to redirect user to complete authentication only available
   * for `redirected` result).
   */
  public get redirectURL() {
    return this.options.redirectURL;
  }

  /**
   * Constructor is not supposed to be used directly, please use corresponding static factory methods instead.
   * @param status Indicates the status of the authentication result.
   * @param [options] Optional argument that includes additional authentication options.
   */
  constructor(
    private readonly status: AuthenticationResultStatus,
    private readonly options: AuthenticationOptions = {}
  ) {}

  /**
   * Indicates that authentication couldn't be performed with the provided credentials.
   */
  public notHandled() {
    return this.status === AuthenticationResultStatus.NotHandled;
  }

  /**
   * Indicates that authentication succeeded.
   */
  public succeeded() {
    return this.status === AuthenticationResultStatus.Succeeded;
  }

  /**
   * Indicates that authentication failed.
   */
  public failed() {
    return this.status === AuthenticationResultStatus.Failed;
  }

  /**
   * Indicates that authentication needs user to be redirected.
   */
  public redirected() {
    return this.status === AuthenticationResultStatus.Redirected;
  }

  /**
   * Checks whether authentication result implies state update.
   */
  public shouldUpdateState() {
    // State shouldn't be updated in case it wasn't set or was specifically set to `null`.
    return this.options.state != null;
  }

  /**
   * Checks whether authentication result implies state clearing.
   */
  public shouldClearState() {
    return this.options.state === null;
  }
}
