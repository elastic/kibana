import _ from 'lodash';
import dateMath from '@elastic/datemath';
import { uiModules } from 'ui/modules';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import visualizeTemplate from 'ui/visualize/visualize.html';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import 'angular-sanitize';
import './visualization';
import './visualization_editor';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

import { ResizeCheckerProvider } from 'ui/resize_checker';


import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function ($timeout, Notifier, Private, timefilter, getAppState, Promise) {
    const notify = new Notifier({ location: 'Visualize' });
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const ResizeChecker = Private(ResizeCheckerProvider);

    function getHandler(from, name) {
      if (typeof name === 'function') return name;
      return from.find(handler => handler.name === name).handler;
    }

    return {
      restrict: 'E',
      scope: {
        showSpyPanel: '=?',
        editorMode: '=?',
        savedObj: '=?',
        appState: '=?',
        uiState: '=?',
        timeRange: '=?',
      },
      template: visualizeTemplate,
      link: async function ($scope, $el) {
        let destroyed = false;
        if (!$scope.savedObj) throw(`saved object was not provided to <visualize> directive`);
        if (!$scope.appState) $scope.appState = getAppState();

        const resizeChecker = new ResizeChecker($el, { disabled: true });
        $timeout(() => {
          // We give the visualize one digest cycle time to actually render before
          // we start tracking its size. If we don't do that, we cause a double
          // initial rendering in editor mode.
          resizeChecker.enable();
        });

        $scope.vis = $scope.savedObj.vis;

        // Set the passed in uiState to the vis object. uiState reference should never be changed
        if (!$scope.uiState) $scope.uiState = $scope.vis.getUiState();
        else $scope.vis._setUiState($scope.uiState);

        $scope.vis.description = $scope.savedObj.description;

        if ($scope.timeRange) {
          $scope.vis.params.timeRange = {
            min: dateMath.parse($scope.timeRange.min),
            max: dateMath.parse($scope.timeRange.max)
          };

          $scope.vis.aggs.forEach(agg => {
            if (agg.type.name !== 'date_histogram') return;
            agg.setTimeRange($scope.vis.params.timeRange);
          });

          const searchSource = $scope.savedObj.searchSource;
          const filter = timefilter.get(searchSource.index(), $scope.vis.params.timeRange);
          const searchSourceFilters = searchSource.get('filter');
          if (searchSourceFilters instanceof Array) {
            searchSourceFilters.push(filter);
            searchSource.skipTimeRangeFilter = true;
          }
        }

        $scope.editorMode = $scope.editorMode || false;
        $scope.vis.editorMode = $scope.editorMode;

        const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
        const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

        $scope.fetch = _.debounce(function () {
          // If destroyed == true the scope has already been destroyed, while this method
          // was still waiting for its debounce, in this case we don't want to start
          // fetching new data and rendering.
          if (!$scope.vis.initialized || !$scope.savedObj || destroyed) return;
          // searchSource is only there for courier request handler
          requestHandler($scope.vis, $scope.appState, $scope.uiState, queryFilter, $scope.savedObj.searchSource)
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
              $scope.$apply();
              $scope.$broadcast('render');
              return resp;
            });
        }, 100);

        //todo: clean this one up as well
        const handleVisUpdate = () => {
          if ($scope.editorMode) {
            $scope.appState.vis = $scope.vis.getState();
            $scope.appState.save();
          } else {
            $scope.fetch();
          }
        };
        $scope.vis.on('update', handleVisUpdate);


        const reload = () => {
          $scope.vis.reload = true;
          $scope.fetch();
        };
        $scope.vis.on('reload', reload);
        // auto reload will trigger this event
        $scope.$on('courier:searchRefresh', reload);
        // dashboard will fire fetch event when it wants to refresh
        $scope.$on('fetch', reload);



        const handleQueryUpdate = ()=> {
          $scope.fetch();
        };
        queryFilter.on('update', handleQueryUpdate);

        if ($scope.appState) {
          const stateMonitor = stateMonitorFactory.create($scope.appState);
          stateMonitor.onChange((status, type, keys) => {
            if (keys[0] === 'vis') {
              if ($scope.appState.vis) $scope.vis.setState($scope.appState.vis);
              $scope.fetch();
            }
            if ($scope.vis.type.requiresSearch && ['query', 'filters'].includes(keys[0])) {
              $scope.fetch();
            }
          });

          $scope.$on('$destroy', () => {
            stateMonitor.destroy();
          });
        }

        // Listen on uiState changes to start fetching new data again.
        // Some visualizations might need different data depending on their uiState,
        // thus we need to retrigger. The request handler should take care about
        // checking if anything changed, that actually require a new fetch or return
        // cached data otherwise.
        $scope.uiState.on('change', $scope.fetch);
        resizeChecker.on('resize', $scope.fetch);

        // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);

        $scope.$on('$destroy', () => {
          destroyed = true;
          $scope.vis.removeListener('update', handleVisUpdate);
          queryFilter.off('update', handleQueryUpdate);
          $scope.uiState.off('change', $scope.fetch);
          resizeChecker.destroy();
        });

        $scope.$watch('vis.initialized', $scope.fetch);

        $scope.fetch();
      }
    };
  });
