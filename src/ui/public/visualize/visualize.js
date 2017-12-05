import _ from 'lodash';
import dateMath from '@elastic/datemath';
import { uiModules } from 'ui/modules';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import visualizeTemplate from 'ui/visualize/visualize.html';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';
import { ResizeCheckerProvider } from 'ui/resize_checker';
import 'angular-sanitize';
import './visualization';
import './visualization_editor';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { PersistedState } from 'ui/persisted_state';


import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function (Notifier, Private, timefilter, getAppState, Promise) {
    const notify = new Notifier({ location: 'Visualize' });
    const requestHandlers = Private(VisRequestHandlersRegistryProvider);
    const responseHandlers = Private(VisResponseHandlersRegistryProvider);
    const ResizeChecker = Private(ResizeCheckerProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

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
        savedId: '=?',
        timeRange: '=?',
      },
      template: visualizeTemplate,
      link: async function ($scope, $el) {
        const resizeChecker = new ResizeChecker($el);

        if (!$scope.savedObj) throw(`saved object was not provided to <visualize> directive`);
        if (!$scope.appState) $scope.appState = getAppState();
        if (!$scope.uiState) $scope.uiState = new PersistedState({});

        $scope.vis = $scope.savedObj.vis;
        $scope.vis.visualizeScope = true;
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

        // spy panel is supported only with courier request handler
        $scope.shouldShowSpyPanel = () => {
          if ($scope.vis.type.requestHandler !== 'courier') return false;
          return $scope.vis.type.requiresSearch && $scope.showSpyPanel;
        };

        const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
        const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

        $scope.fetch = _.debounce(function () {
          if (!$scope.vis.initialized || !$scope.savedObj) return;
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
              $el.trigger('renderComplete');
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
          let oldUiState;
          const stateMonitor = stateMonitorFactory.create($scope.appState);
          stateMonitor.onChange((status, type, keys) => {
            if (keys[0] === 'vis') {
              if ($scope.appState.vis) $scope.vis.setState($scope.appState.vis);
              $scope.fetch();
            }
            if ($scope.vis.type.requiresSearch && ['query', 'filters'].includes(keys[0])) {
              $scope.fetch();
            }
            if (keys[0] === 'uiState') {
            // uiState can be changed by other visualizations on dashboard. this makes sure this fires only if
            // current visualizations uiState changed.
              if (!oldUiState || oldUiState !== JSON.stringify($scope.uiState.toJSON())) {
                oldUiState = JSON.stringify($scope.uiState.toJSON());
                $scope.fetch();
              }
            }
          });

          $scope.$on('$destroy', () => {
            stateMonitor.destroy();
          });
        } else {
          const handleUiStateChange = () => { $scope.$broadcast('render'); };
          $scope.uiState.on('change', handleUiStateChange);
          $scope.$on('$destroy', () => {
            $scope.uiState.off('change', handleUiStateChange);
          });
        }

        // the very first resize event is the initialization, which we can safely ignore.
        // however, we also want to debounce the resize event, and not miss a resize event
        // if it occurs within the first 200ms window
        const resizeFunc = _.debounce(() => {
          $scope.$broadcast('render');
        }, 200);

        let resizeInit = false;
        resizeChecker.on('resize',  () => {
          if (!resizeInit) return resizeInit = true;
          resizeFunc();
        });

        // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);
        $scope.$on('renderComplete', () => {
          $el.trigger('renderComplete');
        });

        $scope.$on('$destroy', () => {
          $scope.vis.removeListener('update', handleVisUpdate);
          queryFilter.off('update', handleQueryUpdate);
          resizeChecker.destroy();
        });

        $scope.$watch('vis.initialized', $scope.fetch);

        $scope.fetch();
      }
    };
  });
