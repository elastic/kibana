/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../util/app_state_utils';
import { severity$ } from './select_severity';

module.service('mlSelectSeverityService', function (AppState, $rootScope) {
  subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => $rootScope.$applyAsync());
});
