/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { uiModules } from '../modules';
import { once, clone } from 'lodash';

import toggleHtml from './kbn_global_timepicker.html';
import { timeNavigation } from './time_navigation';

uiModules
  .get('kibana')
  .directive('kbnGlobalTimepicker', (timefilter, globalState, $rootScope) => {
    const listenForUpdates = once($scope => {
      $scope.$listen(timefilter, 'update', () => {
        globalState.time = clone(timefilter.time);
        globalState.refreshInterval = clone(timefilter.refreshInterval);
        globalState.save();
      });
    });

    return {
      template: toggleHtml,
      replace: true,
      require: '^kbnTopNav',
      link: ($scope, element, attributes, kbnTopNav) => {
        listenForUpdates($rootScope);

        $rootScope.timefilter = timefilter;
        $rootScope.toggleRefresh = () => {
          timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
        };

        $scope.forward = function () {
          timefilter.time = timeNavigation.stepForward(timefilter.getBounds());
        };

        $scope.back = function () {
          timefilter.time = timeNavigation.stepBackward(timefilter.getBounds());
        };

        $scope.updateFilter = function (from, to) {
          timefilter.time.from = from;
          timefilter.time.to = to;
          kbnTopNav.close('filter');
        };

        $scope.updateInterval = function (interval) {
          timefilter.refreshInterval = interval;
          kbnTopNav.close('interval');
        };

        $scope.getSharedTimeFilterFromDate = function () {
          return (timefilter.isAutoRefreshSelectorEnabled || timefilter.isTimeRangeSelectorEnabled)
            ? timefilter.getBounds().min.clone().utc().format()
            : null;
        };

        $scope.getSharedTimeFilterToDate = function () {
          return (timefilter.isAutoRefreshSelectorEnabled || timefilter.isTimeRangeSelectorEnabled)
            ? timefilter.getBounds().max.clone().utc().format()
            : null;
        };
      },
    };
  });
