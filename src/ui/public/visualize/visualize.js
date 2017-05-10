import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import visualizeTemplate from 'ui/visualize/visualize.html';
import { RequestHandlersRegistryProvider } from 'ui/registry/request_handlers';
import { ResponseHandlersRegistryProvider } from 'ui/registry/response_handlers';
import 'angular-sanitize';
import './visualization';
import './visualization_editor';

import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, timefilter) {
  const notify = new Notifier({
    location: 'Visualize'
  });
  const requestHandlers = Private(RequestHandlersRegistryProvider);
  const responseHandlers = Private(ResponseHandlersRegistryProvider);

  function getHandler(from, name) {
    if (typeof name === 'function') return name;
    return from.find(handler => handler.name === name).handler;
  }


  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      showSpyPanel: '=?',
      editorMode: '=?',
      savedVis: '=',
      appState: '=',
      uiState: '=?'
    },
    template: visualizeTemplate,
    link: function ($scope, $el) {
      if (_.isUndefined($scope.editorMode)) {
        $scope.editorMode = false;
      }
      if (_.isUndefined($scope.showSpyPanel)) {
        $scope.showSpyPanel = true;
      }

      $scope.vis = $scope.savedVis.vis;

      //const visualizeApi = $scope.savedVis.vis.api;
      // searchSource is only there for courier request handler
      const searchSource = $scope.savedVis.searchSource;

      // get request handler from registry (this should actually happen only once not on every fetch)
      const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
      const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

      // BWC
      //$scope.vis.listeners.click = visualizeApi.events.filter;
      //$scope.vis.listeners.brush = visualizeApi.events.brush;

      $scope.fetch = function () {
        requestHandler($scope.appState, searchSource)
          .then(resp => responseHandler($scope.vis, resp), e => {
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
            $scope.esResp = resp;
            $scope.$apply();
            return resp;
          });
      };

      const stateMonitor = stateMonitorFactory.create($scope.appState);

      $scope.$watch('vis.params', () => {
        $scope.$broadcast('render');
      });

      if (_.get($scope, 'savedVis.vis.type.requiresSearch')) {
        let currentAggJson = $scope.editorMode ? JSON.stringify($scope.appState.vis.aggs) : null;
        stateMonitor.onChange((status, type, keys) => {
          if (['query', 'filter'].includes(keys[0])) $scope.fetch();
          if ($scope.editorMode && keys[0] === 'vis') {
            // only send new query if aggs changed
            const isAggregationsChanged = JSON.stringify($scope.appState.vis.aggs) !== currentAggJson;
            if (isAggregationsChanged) {
              $scope.fetch();
            } else {
              $scope.$broadcast('render');
            }
            currentAggJson = JSON.stringify($scope.appState.vis.aggs);
          }
        });

        // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);

        $scope.fetch();
      }
    }
  };
});
