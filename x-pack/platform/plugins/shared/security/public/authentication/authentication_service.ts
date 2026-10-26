/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSetup,
  FatalErrorsSetup,
  HttpSetup,
  StartServicesAccessor,
} from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

import { accessAgreementApp } from './access_agreement';
import { captureURLApp } from './capture_url';
import { loggedOutApp } from './logged_out';
import { loginApp } from './login';
import { logoutApp } from './logout';
import { overwrittenSessionApp } from './overwritten_session';
import { resetSessionApp } from './reset_session';
import { unauthenticatedApp } from './unauthenticated';
import type { AuthenticatedUser } from '../../common';
import type { ConfigType } from '../config';
import type { PluginStartDependencies } from '../plugin';

interface SetupParams {
  application: ApplicationSetup;
  fatalErrors: FatalErrorsSetup;
  config: ConfigType;
  http: HttpSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}
export class AuthenticationService {
  public setup({
    application,
    fatalErrors,
    config,
    getStartServices,
    http,
  }: SetupParams): AuthenticationServiceSetup {
    // The shape returned by `/internal/security/me` is effectively immutable for
    // the lifetime of a page: any change to the authenticated identity (login,
    // logout, session expiry, account switch) triggers a full page reload via
    // the unauthorized response interceptor, which discards this closure with
    // the rest of the JS context. Several consumers (analytics, the nav
    // control, cloud links, account management, etc.) all request the current
    // user independently during bootstrap; without coordination they each
    // issue their own HTTP call. Cache the promise so concurrent callers share
    // a single in-flight request and later callers reuse the resolved value.
    // On rejection we drop the cache so subsequent callers can retry.
    let cachedCurrentUser: Promise<AuthenticatedUser> | undefined;
    const getCurrentUser = (): Promise<AuthenticatedUser> => {
      if (!cachedCurrentUser) {
        cachedCurrentUser = (
          http.get('/internal/security/me', { asSystemRequest: true }) as Promise<AuthenticatedUser>
        ).catch((error) => {
          cachedCurrentUser = undefined;
          throw error;
        });
      }
      return cachedCurrentUser;
    };

    const areAPIKeysEnabled = async () =>
      ((await http.get('/internal/security/api_key/_enabled')) as { apiKeysEnabled: boolean })
        .apiKeysEnabled;

    accessAgreementApp.create({ application, getStartServices });
    captureURLApp.create({ application, fatalErrors, http });
    loginApp.create({ application, config, getStartServices, http });
    logoutApp.create({ application, http });
    loggedOutApp.create({ application, getStartServices, http });
    overwrittenSessionApp.create({ application, authc: { getCurrentUser }, getStartServices });
    resetSessionApp.create({ application, getStartServices, http });
    unauthenticatedApp.create({ application, getStartServices, http });

    const isUIAMEnabled = () => config.uiam?.enabled === true;

    return { getCurrentUser, areAPIKeysEnabled, isUIAMEnabled };
  }
}
