/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { uiModules } from 'ui/modules';
import { npSetup, npStart } from 'ui/new_platform';
import routes from 'ui/routes';
import { isSystemApiRequest } from '../../../../../../src/plugins/kibana_legacy/public';
import { SecurityPluginSetup } from '../../../../../plugins/security/public';

const securityPluginSetup = (npSetup.plugins as any).security as SecurityPluginSetup;
if (securityPluginSetup) {
  routes.when('/account', {
    template: '<div />',
    controller: () => npStart.core.application.navigateToApp('security_account'),
  });

  const getNextParameter = () => {
    const { location } = window;
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return `&next=${next}`;
  };

  const getProviderParameter = (tenant: string) => {
    const key = `${tenant}/session_provider`;
    const providerName = sessionStorage.getItem(key);
    return providerName ? `&provider=${encodeURIComponent(providerName)}` : '';
  };

  const module = uiModules.get('security', []);
  module.config(($httpProvider: ng.IHttpProvider) => {
    $httpProvider.interceptors.push(($q, $window, Promise) => {
      const isAnonymous = npSetup.core.http.anonymousPaths.isAnonymous(window.location.pathname);

      function interceptorFactory(responseHandler: (response: ng.IHttpResponse<unknown>) => any) {
        return function interceptor(response: ng.IHttpResponse<unknown>) {
          if (!isAnonymous && !isSystemApiRequest(response.config)) {
            securityPluginSetup.sessionTimeout.extend(response.config.url);
          }

          if (response.status !== 401 || isAnonymous) {
            return responseHandler(response);
          }

          const { logoutUrl, tenant } = securityPluginSetup.__legacyCompat;
          const next = getNextParameter();
          const provider = getProviderParameter(tenant);

          $window.location.href = `${logoutUrl}?msg=SESSION_EXPIRED${next}${provider}`;

          return Promise.halt();
        };
      }

      return {
        response: interceptorFactory((response) => response),
        responseError: interceptorFactory($q.reject),
      };
    });
  });
}
