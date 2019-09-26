/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
* AngularJS service for storing limit values in AppState.
*/


import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { subscribeAppStateToObservable } from '../../util/app_state_utils';
import { limit$ } from './select_limit';

module.service('mlSelectLimitService', function (AppState, $rootScope) {
  subscribeAppStateToObservable(AppState, 'mlSelectLimit', limit$, () => $rootScope.$applyAsync());
});
