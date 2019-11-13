/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import { merge } from 'lodash';

import React from 'react';
import ReactDOM from 'react-dom';

import moment from 'moment-timezone';

import { Subscription } from 'rxjs';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';

import { TimeBuckets } from 'plugins/ml/util/time_buckets';

import { jobSelectServiceFactory } from '../components/job_selector/job_select_service_utils';

import { interval$ } from '../components/controls/select_interval';
import { severity$ } from '../components/controls/select_severity';
import { showCharts$ } from '../components/controls/checkbox_showcharts';
import { subscribeAppStateToObservable } from '../util/app_state_utils';

import { Explorer } from './explorer';
import { EXPLORER_ACTION } from './explorer_constants';
import { getExplorerDefaultAppState, explorerAction$, explorerAppState$ } from './explorer_dashboard_service';

module.directive('mlExplorerDirective', function (config, globalState, $rootScope, $timeout, AppState) {
  function link($scope, element) {
    const subscriptions = new Subscription();

    const { jobSelectService$, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);

    // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
    const tzConfig = config.get('dateFormat:tz');
    const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

    ReactDOM.render(
      <I18nContext>
        <Explorer {...{
          dateFormatTz,
          globalState,
          jobSelectService$,
          TimeBuckets,
        }}
        />
      </I18nContext>,
      element[0]
    );

    // Initialize the AppState in which to store swimlane and filter settings.
    // AppState is used to store state in the URL.
    $scope.appState = new AppState(getExplorerDefaultAppState());

    // Pass the current URL AppState on to anomaly explorer's reactive state.
    // After this hand-off, the appState stored in explorerState$ is the single
    // source of truth.
    explorerAction$.next({
      action: EXPLORER_ACTION.APP_STATE_SET,
      payload: {
        mlExplorerSwimlane: $scope.appState.mlExplorerSwimlane,
        mlExplorerFilter: $scope.appState.mlExplorerFilter,
      }
    });

    // This is temporary and can be removed once explorer.js migrated fully
    // from explorer$ to explorerState$. This needs to be done only once
    // the original URL AppState has been passed on to the observable state above.
    explorerAction$.next(null);

    // Now that appState in explorerState$ is the single source of truth,
    // subscribe to it and update the actual URL appState on changes.
    subscriptions.add(
      explorerAppState$.subscribe(appState => {
        $scope.appState.fetch();
        $scope.appState = merge($scope.appState, appState);
        $scope.appState.save();
        $scope.$applyAsync();
      })
    );

    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlShowCharts', showCharts$, () => $rootScope.$applyAsync()));
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () => $rootScope.$applyAsync()));
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => $rootScope.$applyAsync()));

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      $scope.$destroy();
      subscriptions.unsubscribe();
      unsubscribeFromGlobalState();
    });
  }

  return { link };
});
