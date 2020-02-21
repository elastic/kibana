/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular, { IWindowService } from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';

import { AppMountContext } from 'kibana/public';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';

import {
  GlobalStateProvider,
  StateManagementConfigProvider,
  AppStateProvider,
  EventsProvider,
  PersistedState,
  createTopNavDirective,
  createTopNavHelper,
  KbnUrlProvider,
  RedirectWhenMissingProvider,
  npStart,
} from '../legacy_imports';

// @ts-ignore
import { PromiseServiceCreator } from './providers/promises';
// @ts-ignore
import { PrivateProvider } from './providers/private';

type IPrivate = <T>(provider: (...injectable: any[]) => T) => T;

export const appModuleName = 'monitoring';
const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react'];

export const localAppModule = (core: AppMountContext['core']) => {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalPromiseModule();
  createLocalStorage();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalStateModule();
  createLocalPersistedStateModule();
  createLocalTopNavModule(npStart.plugins.navigation);
  createHrefModule(core);

  const appModule = angular.module(appModuleName, [
    ...thirdPartyAngularDependencies,
    'monitoring/Config',
    'monitoring/I18n',
    'monitoring/Private',
    'monitoring/PersistedState',
    'monitoring/TopNav',
    'monitoring/State',
    'monitoring/Storage',
    'monitoring/href',
    'monitoring/services',
    'monitoring/filters',
    'monitoring/directives',
  ]);
  return appModule;
};

function createLocalStateModule() {
  angular
    .module('monitoring/State', [
      'monitoring/Private',
      'monitoring/Config',
      'monitoring/KbnUrl',
      'monitoring/Promise',
      'monitoring/PersistedState',
    ])
    .factory('AppState', function(Private: IPrivate) {
      return Private(AppStateProvider);
    })
    .service('globalState', function(Private: IPrivate) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('monitoring/PersistedState', ['monitoring/Private', 'monitoring/Promise'])
    .factory('PersistedState', (Private: IPrivate) => {
      const Events = Private(EventsProvider);
      return class AngularPersistedState extends PersistedState {
        constructor(value: any, path: string) {
          super(value, path, Events);
        }
      };
    });
}

function createLocalKbnUrlModule() {
  angular
    .module('monitoring/KbnUrl', ['monitoring/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider))
    .service('redirectWhenMissing', (Private: IPrivate) => Private(RedirectWhenMissingProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('monitoring/Config', ['monitoring/Private'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: core.uiSettings.get.bind(core.uiSettings),
        }),
      };
    });
}

function createLocalPromiseModule() {
  angular.module('monitoring/Promise', []).service('Promise', PromiseServiceCreator);
}

function createLocalStorage() {
  angular
    .module('monitoring/Storage', [])
    .service('localStorage', ($window: IWindowService) => new Storage($window.localStorage))
    .service('sessionStorage', ($window: IWindowService) => new Storage($window.sessionStorage))
    .service('sessionTimeout', () => {});
}

function createLocalPrivateModule() {
  angular.module('monitoring/Private', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule({ ui }: any) {
  angular
    .module('monitoring/TopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper(ui));
}

function createLocalI18nModule() {
  angular
    .module('monitoring/I18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}

function createHrefModule(core: AppMountContext['core']) {
  const name: string = 'kbnHref';
  angular.module('monitoring/href', []).directive(name, () => {
    return {
      restrict: 'A',
      link: {
        pre: (_$scope, _$el, $attr) => {
          $attr.$observe(name, val => {
            if (val) {
              $attr.$set('href', core.http.basePath.prepend(val as string));
            }
          });
        },
      },
    };
  });
}
