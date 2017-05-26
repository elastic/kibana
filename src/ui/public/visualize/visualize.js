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
.directive('visualize', function (Notifier, Private, timefilter) {
  const notify = new Notifier({ location: 'Visualize' });
  const requestHandlers = Private(RequestHandlersRegistryProvider);
  const responseHandlers = Private(ResponseHandlersRegistryProvider);

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
      $scope.vis = $scope.savedObj.vis;
      $scope.editorMode = $scope.editorMode || false;
      $scope.vis.showSpyPanel = $scope.showSpyPanel || false;
      $scope.vis.editorMode = $scope.editorMode;

      const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
      const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

      $scope.fetch = function () {
        // searchSource is only there for courier request handler
        requestHandler($scope.vis, $scope.appState, $scope.uiState, $scope.savedObj.searchSource)
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
            $scope.$broadcast('render');
            return resp;
          });
      };

      $scope.vis.on('update', () => {
        if ($scope.editorMode) {
          const visState = $scope.vis.getState();
          $scope.appState.vis = visState;
          $scope.appState.save();
        } else {
          $scope.fetch();
        }
      });

      const stateMonitor = stateMonitorFactory.create($scope.appState);
      if ($scope.vis.type.requiresSearch) {
        stateMonitor.onChange((status, type, keys) => {
          if (['query', 'filters', 'vis'].includes(keys[0])) {
            $scope.vis.setState($scope.appState.vis);
            $scope.fetch();
          }
        });

        // visualize needs to know about timeFilter
        $scope.$listen(timefilter, 'fetch', $scope.fetch);
      }

      $scope.fetch();
    }
  };
});
