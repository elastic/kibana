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

import _ from 'lodash';
import { uiModules } from '../modules';
import { VisRequestHandlersRegistryProvider } from '../registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from '../registry/vis_response_handlers';
import 'angular-sanitize';
import './visualization';
import { FilterBarQueryFilterProvider } from '../filter_bar/query_filter';
import { visualizationLoader } from './loader/visualization_loader';

import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function ($timeout, Notifier, Private, Promise, courier) {
    const notify = new Notifier({ location: 'Visualize' });
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    function getHandler(from, name) {
      if (typeof name === 'function') return name;
      return from.find(handler => handler.name === name).handler;
    }

    return {
      restrict: 'E',
      scope: {
        savedObj: '=?',
        uiState: '=?',
        timeRange: '=?',
        filters: '=?',
        query: '=?',
        updateState: '=?',
      },
      link: async function ($scope, $el) {
        let destroyed = false;
        let loaded = false;
        let forceFetch = false;
        if (!$scope.savedObj) throw(`saved object was not provided to <visualize> directive`);

        $scope.vis = $scope.savedObj.vis;
        $scope.vis.searchSource = $scope.savedObj.searchSource;

        // Set the passed in uiState to the vis object. uiState reference should never be changed
        if (!$scope.uiState) $scope.uiState = $scope.vis.getUiState();
        else $scope.vis._setUiState($scope.uiState);

        $scope.vis.description = $scope.savedObj.description;

        const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
        const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

        const fetch = () => {
          // If destroyed == true the scope has already been destroyed, while this method
          // was still waiting for its debounce, in this case we don't want to start
          // fetching new data and rendering.
          if (!loaded || !$scope.savedObj || destroyed) return;

          $scope.vis.filters = { timeRange: $scope.timeRange };

          const handlerParams = {
            uiState: $scope.uiState,
            queryFilter: queryFilter,
            searchSource: $scope.savedObj.searchSource,
            aggs: $scope.vis.getAggConfig(),
            timeRange: $scope.timeRange,
            filters: $scope.filters,
            query: $scope.query,
            forceFetch,
          };

          // Reset forceFetch flag, since we are now executing our forceFetch in case it was true
          forceFetch = false;

          // searchSource is only there for courier request handler
          return requestHandler($scope.vis, handlerParams)
            .then(requestHandlerResponse => {

              //No need to call the response handler when there have been no data nor has been there changes
              //in the vis-state (response handler does not depend on uiStat
              const canSkipResponseHandler = (
                $scope.previousRequestHandlerResponse && $scope.previousRequestHandlerResponse === requestHandlerResponse &&
              $scope.previousVisState && _.isEqual($scope.previousVisState, $scope.vis.getState())
              );

              $scope.previousVisState = $scope.vis.getState();
              $scope.previousRequestHandlerResponse = requestHandlerResponse;
              return canSkipResponseHandler ? $scope.visData : Promise.resolve(responseHandler($scope.vis, requestHandlerResponse));
            }, e => {
              $scope.savedObj.searchSource.cancelQueued();
              $scope.vis.requestError = e;
              if (isTermSizeZeroError(e)) {
                return notify.error(
                  `Your visualization ('${$scope.vis.title}') has an error: it has a term ` +
                `aggregation with a size of 0. Please set it to a number greater than 0 to resolve ` +
                `the error.`
                );
              }
              notify.error(e);
            })
            .then(resp => {
              $scope.visData = resp;

              visualizationLoader($el[0], $scope.vis, $scope.visData, $scope.uiState, { listenOnChange: false });

              return resp;
            });
        };

        $scope.fetch = _.debounce(fetch, 100);
        courier.setSearchCallback(fetch);

        const handleVisUpdate = () => {
          if ($scope.updateState) {
            const visState = $scope.vis.getState();
            $scope.updateState(visState);
          }
          $scope.fetch();
        };
        $scope.vis.on('update', handleVisUpdate);

        const reload = () => {
          forceFetch = true;
          $scope.fetch();
        };
        $scope.vis.on('reload', reload);

        $scope.$watch('filters', $scope.fetch, true);
        $scope.$watch('query', $scope.fetch, true);
        $scope.$watch('timeRange', $scope.fetch, true);

        // Listen on uiState changes to start fetching new data again.
        // Some visualizations might need different data depending on their uiState,
        // thus we need to retrigger. The request handler should take care about
        // checking if anything changed, that actually require a new fetch or return
        // cached data otherwise.
        $scope.uiState.on('change', $scope.fetch);

        $scope.$on('$destroy', () => {
          destroyed = true;
          $scope.vis.removeListener('reload', reload);
          $scope.vis.removeListener('update', handleVisUpdate);
          $scope.uiState.off('change', $scope.fetch);
          visualizationLoader.destroy($el[0]);
          courier.clearSearchCallback();
        });

        visualizationLoader(
          $el[0],
          $scope.vis,
          $scope.visData,
          $scope.uiState,
          { listenOnChange: false }
        ).then(() => {
          loaded = true;
          $scope.fetch();
        });

      }
    };
  });
