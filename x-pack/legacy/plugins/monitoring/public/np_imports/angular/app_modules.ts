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
  createTopNavDirective,
  createTopNavHelper,
} from '../../../../../../../src/plugins/kibana_legacy/public';

import { GlobalState } from '../../np_ready/url_state';

// @ts-ignore
import { PrivateProvider } from './providers/private';
// @ts-ignore
import { KbnUrlProvider } from './providers/url';

export const appModuleName = 'monitoring';

type IPrivate = <T>(provider: (...injectable: unknown[]) => T) => T;
//const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'ui.bootstrap', 'ui.ace'];

const thirdPartyAngularDependencies = ['ngRoute', 'react', 'ui.bootstrap'];

export const localAppModule = (core: AppMountContext['core'], query: any, navigation: any) => { // TODO: add types
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalStorage();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalStateModule(query);
  createLocalTopNavModule(navigation);
  createHrefModule(core);

  const appModule = angular.module(appModuleName, [
    ...thirdPartyAngularDependencies,
    'monitoring/Config',
    'monitoring/I18n',
    'monitoring/Private',
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

function createLocalStateModule(query: any) {
  angular
    .module('monitoring/State', [
      'monitoring/Private',
      'monitoring/Config',
      'monitoring/KbnUrl',
    ])
    .service('globalState', function (Private: IPrivate, $rootScope: ng.IRootScopeService, $location: ng.ILocationService) {
      function GlobalStateProvider(this: any) {
        const state = new GlobalState(query, $rootScope, $location, this);
        const initialState: any = state.getState();
        for (const key in initialState) {
          this[key] = initialState[key];
        }
        this.save = () => {
          const newState = { ...this };
          delete newState.save;
          state.setState(newState);
        }
      }
      return Private(GlobalStateProvider);
    });
}

function createLocalKbnUrlModule() {
  angular
    .module('monitoring/KbnUrl', ['monitoring/Private', 'ngRoute'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('monitoring/Config', ['monitoring/Private'])
    .provider('config', () => {
      return {
        $get: () => ({
          get: core.uiSettings.get.bind(core.uiSettings),
        }),
      };
    });
}

function createLocalStorage() {
  angular
    .module('monitoring/Storage', [])
    .service('localStorage', ($window: IWindowService) => new Storage($window.localStorage))
    .service('sessionStorage', ($window: IWindowService) => new Storage($window.sessionStorage))
    .service('sessionTimeout', () => { });
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
