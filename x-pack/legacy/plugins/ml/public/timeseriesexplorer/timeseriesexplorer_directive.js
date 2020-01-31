/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment-timezone';
import { Subscription } from 'rxjs';

import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { timefilter } from 'ui/timefilter';
import { I18nContext } from 'ui/i18n';

import '../components/controls';

import { severity$ } from '../components/controls/select_severity/select_severity';
import { interval$ } from '../components/controls/select_interval/select_interval';
import { subscribeAppStateToObservable } from '../util/app_state_utils';

import { TimeSeriesExplorer } from './timeseriesexplorer';
import { APP_STATE_ACTION } from './timeseriesexplorer_constants';

module.directive('mlTimeSeriesExplorer', function($injector) {
  function link($scope, $element) {
    const globalState = $injector.get('globalState');
    const AppState = $injector.get('AppState');
    const config = $injector.get('config');

    const subscriptions = new Subscription();
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$));
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$));

    $scope.appState = new AppState({ mlTimeSeriesExplorer: {} });

    const appStateHandler = (action, payload) => {
      $scope.appState.fetch();
      switch (action) {
        case APP_STATE_ACTION.CLEAR:
          delete $scope.appState.mlTimeSeriesExplorer.detectorIndex;
          delete $scope.appState.mlTimeSeriesExplorer.entities;
          delete $scope.appState.mlTimeSeriesExplorer.forecastId;
          break;

        case APP_STATE_ACTION.GET_DETECTOR_INDEX:
          return get($scope, 'appState.mlTimeSeriesExplorer.detectorIndex');
        case APP_STATE_ACTION.SET_DETECTOR_INDEX:
          $scope.appState.mlTimeSeriesExplorer.detectorIndex = payload;
          break;

        case APP_STATE_ACTION.GET_ENTITIES:
          return get($scope, 'appState.mlTimeSeriesExplorer.entities', {});
        case APP_STATE_ACTION.SET_ENTITIES:
          $scope.appState.mlTimeSeriesExplorer.entities = payload;
          break;

        case APP_STATE_ACTION.GET_FORECAST_ID:
          return get($scope, 'appState.mlTimeSeriesExplorer.forecastId');
        case APP_STATE_ACTION.SET_FORECAST_ID:
          $scope.appState.mlTimeSeriesExplorer.forecastId = payload;
          break;

        case APP_STATE_ACTION.GET_ZOOM:
          return get($scope, 'appState.mlTimeSeriesExplorer.zoom');
        case APP_STATE_ACTION.SET_ZOOM:
          $scope.appState.mlTimeSeriesExplorer.zoom = payload;
          break;
        case APP_STATE_ACTION.UNSET_ZOOM:
          delete $scope.appState.mlTimeSeriesExplorer.zoom;
          break;
      }
      $scope.appState.save();
      $scope.$applyAsync();
    };

    function updateComponent() {
      // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
      const tzConfig = config.get('dateFormat:tz');
      const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

      ReactDOM.render(
        <I18nContext>
          <TimeSeriesExplorer
            {...{
              appStateHandler,
              dateFormatTz,
              globalState,
              timefilter,
            }}
          />
        </I18nContext>,
        $element[0]
      );
    }

    $element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode($element[0]);
      subscriptions.unsubscribe();
    });

    updateComponent();
  }

  return {
    link,
  };
});
