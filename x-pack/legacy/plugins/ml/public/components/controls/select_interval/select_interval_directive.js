/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../util/app_state_utils';
import { SelectInterval, interval$ } from './select_interval';

module.service('mlSelectIntervalService', function (AppState, $rootScope) {
  subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () => $rootScope.$applyAsync());
})
  .directive('mlSelectInterval', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      SelectInterval,
      undefined,
      { restrict: 'E' }
    );
  });
