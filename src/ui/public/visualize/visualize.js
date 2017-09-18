import _ from 'lodash';
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


import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
.get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function (Notifier, Private, timefilter, getAppState) {
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
      scope : {
        showSpyPanel: '=?',
        editorMode: '=?',
        savedObj: '=',
        appState: '=',
        uiState: '=?'
      },
      template: visualizeTemplate,
      link: function ($scope, $el) {
        const resizeChecker = new ResizeChecker($el);

        $scope.vis = $scope.savedObj.vis;
        $scope.editorMode = $scope.editorMode || false;
        $scope.vis.editorMode = $scope.editorMode;
        $scope.vis.visualizeScope = true;

        if (!$scope.appState) $scope.appState = getAppState();

        const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
        const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

        $scope.fetch = _.debounce(function () {
          if (!$scope.vis.initialized) return;
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
            return canSkipResponseHandler ? $scope.visData : responseHandler($scope.vis, requestHandlerResponse);
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

        $scope.vis.on('update', () => {
          if ($scope.editorMode) {
            $scope.appState.vis = $scope.vis.getState();
            $scope.appState.save();
          } else {
            $scope.fetch();
          }
        });

        const reload = () => {
          $scope.vis.reload = true;
          $scope.fetch();
        };
        $scope.vis.on('reload', reload);
      // auto reload will trigger this event
        $scope.$on('courier:searchRefresh', reload);
      // dashboard will fire fetch event when it wants to refresh
        $scope.$on('fetch', reload);
        queryFilter.on('update', $scope.fetch);

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
        }

        let resizeInit = false;
        const resizeFunc = _.debounce(() => {
          if (!resizeInit) return resizeInit = true;
          $scope.$broadcast('render');
        }, 200);
        resizeChecker.on('resize',  resizeFunc);

      // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);
        $scope.$on('renderComplete', () => {
          $el.trigger('renderComplete');
        });

        $scope.$on('$destroy', () => {
          resizeChecker.destroy();
        });

        $scope.$watch('vis.initialized', $scope.fetch);

        $scope.fetch();
        $scope.$root.$broadcast('ready:vis');
      }
    };
  });
