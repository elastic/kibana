/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
import { AppMountContext } from 'kibana/public';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import { DataSetup } from 'src/legacy/core_plugins/data/public';
import { AngularHttpError } from 'ui/notify/lib/format_angular_http_error';
import { configureAppAngularModule } from 'ui/legacy_compat';

// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
// @ts-ignore
import { EventsProvider } from 'ui/events';
// @ts-ignore
import { PersistedState } from 'ui/persisted_state';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { initAngularModule } from './app';

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <!-- This base tag is key to making this work -->
  <base href="${basePath}" />
  <div ng-view style="height: 100%; display:flex; justify-content: center;"></div>
</div>
`;

const moduleName = 'app/graph';

export interface GraphDependencies {
  element: HTMLElement;
  appBasePath: string;
  data: DataSetup;
  fatalError: (error: AngularHttpError | Error | string, location?: string) => void;
  xpackInfo: { get(path: string): unknown };
  addBasePath: (url: string) => string;
  getBasePath: () => string;
  KbnUrlProvider: any;
}

export interface LegacyAngularInjectedDependencies {
  /**
   * angular $http service
   */
  $http: any;
  /**
   * src/legacy/ui/public/modals/confirm_modal.js
   */
  confirmModal: any;
  /**
   * Private(SavedObjectRegistryProvider)
   */
  savedObjectRegistry: any;
  kbnBaseUrl: any;
  /**
   * Private(SavedWorkspacesProvider)
   */

  savedWorkspacesClient: any;
  savedGraphWorkspaces: any;
  /**
   * Private(SavedObjectsClientProvider)
   */

  savedObjectsClient: any;

  // These are static values currently fetched from ui/chrome
  canEditDrillDownUrls: string;
  graphSavePolicy: string;
}

export const renderApp = (
  { core }: AppMountContext,
  {
    element,
    appBasePath,
    data,
    fatalError,
    xpackInfo,
    addBasePath,
    getBasePath,
    KbnUrlProvider,
  }: GraphDependencies,
  angularDeps: LegacyAngularInjectedDependencies
) => {
  const deps = {
    capabilities: core.application.capabilities.graph,
    coreStart: core,
    chrome: core.chrome,
    config: core.uiSettings,
    toastNotifications: core.notifications.toasts,
    indexPatterns: data.indexPatterns.indexPatterns,
    data,
    fatalError,
    xpackInfo,
    addBasePath,
    getBasePath,
    KbnUrlProvider,
    ...angularDeps,
  };
  angular
    .module('graphI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
  angular.module('graphPrivate', []).provider('Private', PrivateProvider);
  angular.module('graphPromise', []).service('Promise', PromiseServiceCreator);
  angular
    .module('graphGlobalStateDeps', ['graphPrivate'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: core.uiSettings.get.bind(core.uiSettings),
        }),
      };
    })
    .service('kbnUrl', (Private: any) => Private(KbnUrlProvider));
  angular
    .module('graphUrlStuff', ['graphPrivate', 'graphPromise'])
    .factory('PersistedState', ($injector: any) => {
      const Private = $injector.get('Private');
      const Events = Private(EventsProvider);

      // Extend PersistedState to override the EmitterClass class with
      // our Angular friendly version.
      return class AngularPersistedState extends PersistedState {
        constructor(value: any, path: any) {
          super(value, path, Events);
        }
      };
    });
  angular
    .module('graphTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper);
  // global state is only here because of legacy reasons, it's not actually used.
  // But it is helpful as a reference for Discover
  angular
    .module('graphGlobalState', ['graphPrivate', 'graphGlobalStateDeps', 'graphPromise'])
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
  const graphAngularModule = angular.module(moduleName, [
    'ngSanitize',
    'ngRoute',
    'react',
    'graphI18n',
    'graphPrivate',
    'graphUrlStuff',
    'graphTopNav',
    'graphGlobalState',
  ]);
  configureAppAngularModule(graphAngularModule);
  initAngularModule(graphAngularModule, deps);
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  $injector.get('globalState');
  element.appendChild(mountpoint);
  return () => $injector.get('$rootScope').$destroy();
};
