/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Angular controller for the Machine Learning Single Metric Viewer dashboard, which
 * allows the user to explore a single time series. The controller makes multiple queries
 * to Elasticsearch to obtain the data to populate all the components in the view.
 */

import moment from 'moment-timezone';

import React from 'react';
import ReactDOM from 'react-dom';

import angular from 'angular';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import chrome from 'ui/chrome';
import uiRoutes from 'ui/routes';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';
import { I18nContext } from 'ui/i18n';
import { ResizeChecker } from 'ui/resize_checker';

import '../components/controls';

import { checkFullLicense } from '../license/check_license';

import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';

import { checkGetJobsPrivilege } from '../privilege/check_privilege';

import { mlJobService } from '../services/job_service';

import { loadIndexPatterns } from '../util/index_utils';
import { NavigationMenuContext } from '../util/context_utils';

import { getSingleMetricViewerBreadcrumbs } from './breadcrumbs';
import { TimeSeriesExplorer } from './timeseriesexplorer';

uiRoutes
  .when('/timeseriesexplorer/?', {
    template: '<ml-chart-tooltip /><ml-time-series-explorer class="ml-time-series-explorer" data-test-subj="mlPageSingleMetricViewer" />',
    k7Breadcrumbs: getSingleMetricViewerBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
      mlNodeCount: getMlNodeCount,
      jobs: mlJobService.loadJobsWrapper
    }
  });

module.directive('mlTimeSeriesExplorer', function (
  $injector,
  globalState,
  AppState,
  config) {

  function link($scope, $element) {
    $injector.get('mlSelectIntervalService');
    $injector.get('mlSelectSeverityService');
    const mlJobSelectService = $injector.get('mlJobSelectService');

    // Required to redraw the time series chart when the container is resized.
    const resizeChecker = new ResizeChecker(angular.element('.ml-time-series-explorer'));
    resizeChecker.on('resize', updateComponent);

    // Initialize the AppState in which to store the zoom range.
    const stateDefaults = {
      mlTimeSeriesExplorer: {}
    };
    const appState = new AppState(stateDefaults);

    function updateComponent() {
      const containerPadding = 24;

      // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
      const tzConfig = config.get('dateFormat:tz');
      const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

      ReactDOM.render(
        <I18nContext>
          <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
            <TimeSeriesExplorer {...{
              appState,
              dateFormatTz,
              globalState,
              mlJobSelectService,
              svgWidth: angular.element('.ml-time-series-explorer').width() - containerPadding,
              timefilter,
            }}
            />
          </NavigationMenuContext.Provider>
        </I18nContext>,
        $element[0]
      );
    }

    $element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode($element[0]);
      resizeChecker.destroy();
      $scope.$destroy();
    });

    updateComponent();
  }

  return {
    scope: true,
    link,
  };
});
