/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal } from '@elastic/eui';

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
import { confirmModalFactory } from 'ui/modals/confirm_modal';
// @ts-ignore
import { addAppRedirectMessageToUrl } from 'ui/notify';

// type imports
import {
  AppMountContext,
  ChromeStart,
  LegacyCoreStart,
  SavedObjectsClientContract,
  ToastsStart,
  IUiSettingsClient,
} from 'kibana/public';
import { Plugin as DataPlugin, IndexPatternsContract } from 'src/plugins/data/public';
import { NavigationStart } from 'src/legacy/core_plugins/navigation/public';

// @ts-ignore
import { initGraphApp } from './app';
import { LicensingPluginSetup } from '../../../../plugins/licensing/common/types';
import { checkLicense } from '../../../../plugins/graph/common/check_license';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface GraphDependencies extends LegacyAngularInjectedDependencies {
  element: HTMLElement;
  appBasePath: string;
  capabilities: Record<string, boolean | Record<string, boolean>>;
  coreStart: AppMountContext['core'];
  navigation: NavigationStart;
  licensing: LicensingPluginSetup;
  chrome: ChromeStart;
  config: IUiSettingsClient;
  toastNotifications: ToastsStart;
  indexPatterns: IndexPatternsContract;
  npData: ReturnType<DataPlugin['start']>;
  savedObjectsClient: SavedObjectsClientContract;
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
   * Instance of SavedObjectRegistryProvider
   */
  savedObjectRegistry: any;
  kbnBaseUrl: any;
  /**
   * Instance of SavedWorkspacesProvider
   */
  savedGraphWorkspaces: any;
}

export const renderApp = ({ appBasePath, element, ...deps }: GraphDependencies) => {
  const graphAngularModule = createLocalAngularModule(deps.navigation);
  configureAppAngularModule(graphAngularModule, deps.coreStart as LegacyCoreStart, true);

  const licenseSubscription = deps.licensing.license$.subscribe(license => {
    const info = checkLicense(license);
    const licenseAllowsToShowThisPage = info.showAppLink && info.enableAppLink;

    if (!licenseAllowsToShowThisPage) {
      const newUrl = addAppRedirectMessageToUrl(deps.addBasePath(deps.kbnBaseUrl), info.message);
      window.location.href = newUrl;
    }
  });

  initGraphApp(graphAngularModule, deps);
  const $injector = mountGraphApp(appBasePath, element);
  return () => {
    licenseSubscription.unsubscribe();
    $injector.get('$rootScope').$destroy();
  };
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

function createLocalAngularModule(navigation: NavigationStart) {
  createLocalI18nModule();
  createLocalTopNavModule(navigation);
  createLocalConfirmModalModule();

  const graphAngularModule = angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'graphI18n',
    'graphTopNav',
    'graphConfirmModal',
  ]);
  return graphAngularModule;
}

function createLocalConfirmModalModule() {
  angular
    .module('graphConfirmModal', ['react'])
    .factory('confirmModal', confirmModalFactory)
    .directive('confirmModal', reactDirective => reactDirective(EuiConfirmModal));
}

function createLocalTopNavModule(navigation: NavigationStart) {
  angular
    .module('graphTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(navigation.ui));
}

function createLocalI18nModule() {
  angular
    .module('graphI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}
