/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// inner angular imports
// these are necessary to bootstrap the local angular.
// They can stay even after NP cutover
import angular from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import 'ui/angular-bootstrap';
import 'ace';
import 'ui/kbn_top_nav';
import { configureAppAngularModule } from 'ui/legacy_compat';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { KbnUrlProvider } from 'ui/url';

// type imports
import { DataStart } from 'src/legacy/core_plugins/data/public';
import { AppMountContext } from 'kibana/public';
import { AngularHttpError } from 'ui/notify/lib/format_angular_http_error';
// @ts-ignore
import { initGraphApp } from './app';
import { Plugin as DataPlugin } from '../../../../../src/plugins/data/public';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface GraphDependencies {
  element: HTMLElement;
  appBasePath: string;
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  fatalError: (error: AngularHttpError | Error | string, location?: string) => void;
  xpackInfo: { get(path: string): unknown };
  addBasePath: (url: string) => string;
  getBasePath: () => string;
  Storage: any;
  canEditDrillDownUrls: boolean;
  graphSavePolicy: string;
}

/**
 * Dependencies of the Graph app which rely on the global angular instance.
 * These dependencies have to be migrated to their NP counterparts.
 */
export interface LegacyAngularInjectedDependencies {
  /**
   * angular $http service
   */
  $http: any;
  /**
   * Instance of `src/legacy/ui/public/modals/confirm_modal.js`
   */
  confirmModal: any;
  /**
   * Instance of SavedObjectRegistryProvider
   */
  savedObjectRegistry: any;
  kbnBaseUrl: any;
  /**
   * Instance of SavedWorkspacesProvider
   */
  savedGraphWorkspaces: any;
  /**
   * Private(SavedObjectsClientProvider)
   */
  savedObjectsClient: any;
}

export const renderApp = (
  { core }: AppMountContext,
  {
    element,
    appBasePath,
    data,
    npData,
    fatalError,
    xpackInfo,
    addBasePath,
    getBasePath,
    Storage,
    canEditDrillDownUrls,
    graphSavePolicy,
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
    npData,
    fatalError,
    xpackInfo,
    addBasePath,
    getBasePath,
    KbnUrlProvider,
    Storage,
    canEditDrillDownUrls,
    graphSavePolicy,
    ...angularDeps,
  };

  const graphAngularModule = createLocalAngularModule(core);
  configureAppAngularModule(graphAngularModule);
  initGraphApp(graphAngularModule, deps);
  const $injector = mountGraphApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
};

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%; display:flex; justify-content: center;"></div>
</div>
`;

const moduleName = 'app/graph';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'ui.bootstrap', 'ui.ace'];

function mountGraphApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  element.appendChild(mountpoint);
  return $injector;
}

function createLocalAngularModule(core: AppMountContext['core']) {
  createLocalI18nModule();
  createLocalTopNavModule();

  const graphAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'graphI18n',
    'graphTopNav',
  ]);
  return graphAngularModule;
}

function createLocalTopNavModule() {
  angular
    .module('graphTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper);
}

function createLocalI18nModule() {
  angular
    .module('graphI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
