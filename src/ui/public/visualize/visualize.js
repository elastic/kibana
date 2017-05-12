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
  const notify = new Notifier({ location: 'Visualize' });
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
      $scope.vis = $scope.savedVis.vis;
      $scope.editorMode = $scope.editorMode || false;
      $scope.showSpyPanel = $scope.showSpyPanel || false;

      const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
      const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

      $scope.fetch = function () {
        // searchSource is only there for courier request handler
        requestHandler($scope.vis, $scope.appState, $scope.uiState, $scope.savedVis.searchSource)
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
            $scope.visData = resp;
            $scope.$apply();
            return resp;
          });
      };

      const stateMonitor = stateMonitorFactory.create($scope.appState);

      let currentAggJson = JSON.stringify($scope.vis.getState().aggs);
      $scope.vis.on('update', () => {
        const visState = $scope.vis.getState();

        const isAggregationsChanged = JSON.stringify(visState.aggs) !== currentAggJson;
        if (isAggregationsChanged) {
          $scope.fetch();
        } else {
          $scope.$broadcast('render');
        }
        currentAggJson = JSON.stringify(visState.aggs);

        if ($scope.editorMode) {
          $scope.appState.vis = visState;
          $scope.appState.save();
        }
      });

      if ($scope.vis.type.requiresSearch) {
        stateMonitor.onChange((status, type, keys) => {
          if (['query', 'filter'].includes(keys[0])) {
            $scope.fetch();
          }
        });

        // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);

        $scope.fetch();
      }
    }
  };
});
