/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Headers,
  HttpServiceSetup,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { deepFreeze } from '@kbn/std';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { AuthenticatedUser } from '../../../common';
import type { AuthenticationInfo } from '../../elasticsearch';
import type { UiamServicePublic } from '../../uiam';
import { AuthenticationResult } from '../authentication_result';
import type { DeauthenticationResult } from '../deauthentication_result';
import type { Tokens } from '../tokens';

/**
 * Represents available provider options.
 */
export interface AuthenticationProviderOptions {
  name: string;
  getServerBaseURL: () => string;
  basePath: HttpServiceSetup['basePath'];
  getRequestOriginalURL: (
    request: KibanaRequest,
    additionalQueryStringParameters?: Array<[string, string]>
  ) => string;
  client: IClusterClient;
  logger: Logger;
  tokens: PublicMethodsOf<Tokens>;
  uiam?: UiamServicePublic;
  urls: {
    loggedOut: (request: KibanaRequest) => string;
  };
  isElasticCloudDeployment: () => boolean;
}

/**
 * Represents available provider specific options.
 */
export type AuthenticationProviderSpecificOptions = Record<string, unknown>;

/**
 * Name of the Elastic Cloud built-in SSO realm.
 */
export const ELASTIC_CLOUD_SSO_REALM_NAME = 'cloud-saml-kibana';

/**
 * Names of the user properties that aren't available in the "minimal" authentication mode, and should throw an error
 * when accessed.
 */
const USER_PROPERTIES_NOT_AVAILABLE_IN_MIN_AUTHC_MODE = new Set([
  'username',
  'elastic_cloud_user',
  'authentication_realm',
  'lookup_realm',
  'authentication_type',
  'roles',
]);

/**
 * Base class that all authentication providers should extend.
 */
export abstract class BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type: string;

  /**
   * Type of the provider. We use `this.constructor` trick to get access to the static `type` field
   * of the specific `BaseAuthenticationProvider` subclass.
   */
  public readonly type = (this.constructor as any).type as string;

  /**
   * Logger instance bound to a specific provider context.
   */
  protected readonly logger: Logger;

  /**
   * A proxy for the user object returned in minimally authenticated mode. We cache proxy for each
   * provider to avoid creating them for every request, as they are stateless and can be reused.
   */
  private minAuthenticationUserProxy?: AuthenticatedUser;

  /**
   * Instantiates AuthenticationProvider.
   * @param options Provider options object.
   */
  constructor(protected readonly options: Readonly<AuthenticationProviderOptions>) {
    this.logger = options.logger;
  }

  /**
   * Determines whether intermediate session should be invalidated after a successful login.
   * Some providers need to have their state checked to make sure all pending login attempts have
   * completed before invalidating the session. This is particularly important for the SAML Provider,
   * which may have pending login requests pending
   * @param [state] Optional state object associated with the provider.
   * @returns `true` if the intermediate session should be invalidated, `false` otherwise.
   */
  shouldInvalidateIntermediateSessionAfterLogin(state?: unknown) {
    return true;
  }

  /**
   * Performs initial login request and creates user session. Provider isn't required to implement
   * this method if it doesn't support initial login request.
   * @param request Request instance.
   * @param loginAttempt Login attempt associated with the provider.
   * @param [state] Optional state object associated with the provider.
   */
  async login(
    request: KibanaRequest,
    loginAttempt: unknown,
    state?: unknown
  ): Promise<AuthenticationResult> {
    return AuthenticationResult.notHandled();
  }

  /**
   * Performs request authentication based on the session created during login or other information
   * associated with the request (e.g. `Authorization` HTTP header).
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  abstract authenticate(request: KibanaRequest, state?: unknown): Promise<AuthenticationResult>;

  /**
   * Invalidates user session associated with the request.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider that needs to be invalidated.
   */
  abstract logout(request: KibanaRequest, state?: unknown): Promise<DeauthenticationResult>;

  /**
   * Returns HTTP authentication scheme that provider uses within `Authorization` HTTP header that
   * it attaches to all successfully authenticated requests to Elasticsearch or `null` in case
   * provider doesn't attach any additional `Authorization` HTTP headers.
   */
  abstract getHTTPAuthenticationScheme(): string | null;

  /**
   * Queries Elasticsearch `_authenticate` endpoint to authenticate request and retrieve the user
   * information of authenticated user.
   * @param request Request instance.
   * @param [authHeaders] Optional `Headers` dictionary to send with the request.
   */
  protected async getUser(request: KibanaRequest, authHeaders: Headers = {}) {
    // For "minimal" authentication, we don't need to call the `_authenticate` endpoint and can just
    // return a static user proxy. The caveat here is that we don't validate credentials, but it
    // will be done by the Elasticsearch itself.
    if (request.route.options.security?.authc?.enabled === 'minimal') {
      this.logger.debug(`Performing "minimal" authentication for request ${request.url.pathname}.`);
      return this.getMinAuthenticationUserProxy();
    }

    return this.authenticationInfoToAuthenticatedUser(
      // @ts-expect-error Metadata is defined as Record<string, any>
      await this.options.client
        .asScoped({ headers: { ...request.headers, ...authHeaders } })
        .asCurrentUser.security.authenticate()
    );
  }

  /**
   * Converts Elasticsearch Authentication result to a Kibana authenticated user.
   * @param authenticationInfo Result returned from the `_authenticate` operation.
   */
  protected authenticationInfoToAuthenticatedUser(authenticationInfo: AuthenticationInfo) {
    return deepFreeze({
      ...authenticationInfo,
      authentication_provider: { type: this.type, name: this.options.name },
      elastic_cloud_user:
        this.options.isElasticCloudDeployment() &&
        authenticationInfo.authentication_realm.type === 'saml' &&
        authenticationInfo.authentication_realm.name === ELASTIC_CLOUD_SSO_REALM_NAME,
    } as AuthenticatedUser);
  }

  private getMinAuthenticationUserProxy() {
    if (this.minAuthenticationUserProxy) {
      return this.minAuthenticationUserProxy;
    }

    // We can retrieve `username` and `elastic_cloud_user` from the session, if there is a need in the future.
    // As for `authentication_realm`, `lookup_realm`, `authentication_type` and `roles`, we're considering to
    // remove them in the future to make the `AuthenticatedUser` interface lighter.
    const minUserStub: Partial<AuthenticatedUser> = {
      enabled: true,
      authentication_provider: { type: this.type, name: this.options.name },
    };

    this.minAuthenticationUserProxy = deepFreeze(
      new Proxy(minUserStub as AuthenticatedUser, {
        get: (target, prop, receiver) => {
          const value = Reflect.get(target, prop, receiver);
          if (USER_PROPERTIES_NOT_AVAILABLE_IN_MIN_AUTHC_MODE.has(prop.toString())) {
            this.logger.warn(
              `Property "${String(prop)}" is not available for minimally authenticated users: ${
                new Error().stack
              }`
            );

            // throw new Error(
            //   `Property "${String(prop)}" is not available for minimally authenticated users.`
            // );
          }

          return value;
        },
      })
    );

    return this.minAuthenticationUserProxy;
  }
}
