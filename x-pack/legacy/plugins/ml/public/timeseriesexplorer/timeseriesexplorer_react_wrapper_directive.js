/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Time Series Viewer's React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import moment from 'moment-timezone';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';

import { NavigationMenuContext } from '../util/context_utils';

import { TimeSeriesExplorer } from './timeseriesexplorer';

module.directive('mlTimeseriesexplorerReactWrapper', function (config, globalState, mlJobSelectService) {
  function link(scope, element) {
    function updateComponent() {
      // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
      const tzConfig = config.get('dateFormat:tz');
      const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

      ReactDOM.render(
        <I18nContext>
          <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
            <TimeSeriesExplorer {...{
              chartDetails: scope.chartDetails,
              dateFormatTz,
              dataNotChartable: scope.dataNotChartable,
              detectorId: scope.detectorId,
              detectorIndexChanged: scope.detectorIndexChanged,
              detectors: scope.detectors,
              entities: scope.entities,
              entityFieldValueChanged: scope.entityFieldValueChanged,
              filter: scope.filter,
              globalState,
              hasResults: scope.hasResults,
              loadForForecastId: scope.loadForForecastId,
              jobs: scope.jobs,
              jobSelectService: mlJobSelectService,
              saveSeriesPropertiesAndRefresh: scope.saveSeriesPropertiesAndRefresh,
              showAnnotations: scope.showAnnotations,
              showAnnotationsCheckbox: scope.showAnnotationsCheckbox,
              showForecast: scope.showForecast,
              showForecastCheckbox: scope.showForecastCheckbox,
              showModelBoundsCheckbox: scope.showModelBoundsCheckbox,
              selectedJob: scope.selectedJob,
              tableData: scope.tableData,
              timefilter: scope.timefilter,
              toggleShowAnnotations: scope.toggleShowAnnotations,
              toggleShowForecast: scope.toggleShowForecast,

              // time series chart
              tsc: {
                modelPlotEnabled: scope.modelPlotEnabled,
                contextChartData: scope.contextChartData,
                contextChartSelected: (selection) => {
                  scope.$root.$broadcast('contextChartSelected', selection);
                },
                contextForecastData: scope.contextForecastData,
                contextAggregationInterval: scope.contextAggregationInterval,
                swimlaneData: scope.swimlaneData,
                focusAnnotationData: scope.focusAnnotationData,
                focusChartData: scope.focusChartData,
                focusForecastData: scope.focusForecastData,
                focusAggregationInterval: scope.focusAggregationInterval,
                zoomFrom: scope.zoomFrom,
                zoomTo: scope.zoomTo,
                autoZoomDuration: scope.autoZoomDuration,
                svgWidth: scope.svgWidth,
              },
            }}
            />
          </NavigationMenuContext.Provider>
        </I18nContext>,
        element[0]
      );
    }

    updateComponent();

    scope.$watch(() => {
      updateComponent();
    });

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });
  }

  return {
    scope: false,
    link,
  };
});
