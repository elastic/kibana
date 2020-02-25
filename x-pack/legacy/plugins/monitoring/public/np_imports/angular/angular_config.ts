/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ICompileProvider,
  IHttpProvider,
  IHttpService,
  ILocationProvider,
  IModule,
  IRootScopeService,
} from 'angular';
import $ from 'jquery';
import _, { cloneDeep, forOwn, get, set } from 'lodash';
import * as Rx from 'rxjs';
import { CoreStart, LegacyCoreStart } from 'kibana/public';

const isSystemApiRequest = (request: any) =>
  Boolean(request && request.headers && !!request.headers['kbn-system-api']);

export const configureAppAngularModule = (angularModule: IModule, newPlatform: LegacyCoreStart) => {
  const legacyMetadata = newPlatform.injectedMetadata.getLegacyMetadata();

  forOwn(newPlatform.injectedMetadata.getInjectedVars(), (val, name) => {
    if (name !== undefined) {
      // The legacy platform modifies some of these values, clone to an unfrozen object.
      angularModule.value(name, cloneDeep(val));
    }
  });

  angularModule
    .value('kbnVersion', newPlatform.injectedMetadata.getKibanaVersion())
    .value('buildNum', legacyMetadata.buildNum)
    .value('buildSha', legacyMetadata.buildSha)
    .value('serverName', legacyMetadata.serverName)
    .value('esUrl', getEsUrl(newPlatform))
    .value('uiCapabilities', newPlatform.application.capabilities)
    .config(setupCompileProvider(newPlatform))
    .config(setupLocationProvider())
    .config($setupXsrfRequestInterceptor(newPlatform))
    .run(capture$httpLoadingCount(newPlatform))
    .run($setupUICapabilityRedirect(newPlatform));
};

const getEsUrl = (newPlatform: CoreStart) => {
  const a = document.createElement('a');
  a.href = newPlatform.http.basePath.prepend('/elasticsearch');
  const protocolPort = /https/.test(a.protocol) ? 443 : 80;
  const port = a.port || protocolPort;
  return {
    host: a.hostname,
    port,
    protocol: a.protocol,
    pathname: a.pathname,
  };
};

const setupCompileProvider = (newPlatform: LegacyCoreStart) => (
  $compileProvider: ICompileProvider
) => {
  if (!newPlatform.injectedMetadata.getLegacyMetadata().devMode) {
    $compileProvider.debugInfoEnabled(false);
  }
};

const setupLocationProvider = () => ($locationProvider: ILocationProvider) => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });

  $locationProvider.hashPrefix('');
};

const $setupXsrfRequestInterceptor = (newPlatform: LegacyCoreStart) => {
  const version = newPlatform.injectedMetadata.getLegacyMetadata().version;

  // Configure jQuery prefilter
  $.ajaxPrefilter(({ kbnXsrfToken = true }: any, originalOptions, jqXHR) => {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-version', version);
    }
  });

  return ($httpProvider: IHttpProvider) => {
    // Configure $httpProvider interceptor
    $httpProvider.interceptors.push(() => {
      return {
        request(opts) {
          const { kbnXsrfToken = true } = opts as any;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-version'], version);
          }
          return opts;
        },
      };
    });
  };
};

/**
 * Injected into angular module by ui/chrome angular integration
 * and adds a root-level watcher that will capture the count of
 * active $http requests on each digest loop and expose the count to
 * the core.loadingCount api
 * @param  {Angular.Scope} $rootScope
 * @param  {HttpService} $http
 * @return {undefined}
 */
const capture$httpLoadingCount = (newPlatform: CoreStart) => (
  $rootScope: IRootScopeService,
  $http: IHttpService
) => {
  newPlatform.http.addLoadingCountSource(
    new Rx.Observable(observer => {
      const unwatch = $rootScope.$watch(() => {
        const reqs = $http.pendingRequests || [];
        observer.next(reqs.filter(req => !isSystemApiRequest(req)).length);
      });

      return unwatch;
    })
  );
};

/**
 * integrates with angular to automatically redirect to home if required
 * capability is not met
 */
const $setupUICapabilityRedirect = (newPlatform: CoreStart) => (
  $rootScope: IRootScopeService,
  $injector: any
) => {
  const isKibanaAppRoute = window.location.pathname.endsWith('/app/kibana');
  // this feature only works within kibana app for now after everything is
  // switched to the application service, this can be changed to handle all
  // apps.
  if (!isKibanaAppRoute) {
    return;
  }
  $rootScope.$on(
    '$routeChangeStart',
    (event, { $$route: route }: { $$route?: { requireUICapability: boolean } } = {}) => {
      if (!route || !route.requireUICapability) {
        return;
      }

      if (!get(newPlatform.application.capabilities, route.requireUICapability)) {
        $injector.get('kbnUrl').change('/home');
        event.preventDefault();
      }
    }
  );
};
