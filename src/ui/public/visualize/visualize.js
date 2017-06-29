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

import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualize', function (Notifier, Private, timefilter, getAppState, $timeout) {
  const notify = new Notifier({ location: 'Visualize' });
  const requestHandlers = Private(VisRequestHandlersRegistryProvider);
  const responseHandlers = Private(VisResponseHandlersRegistryProvider);
  const ResizeChecker = Private(ResizeCheckerProvider);

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
      $scope.vis.showSpyPanel = $scope.showSpyPanel || false;
      $scope.vis.editorMode = $scope.editorMode;
      $scope.vis.visualizeScope = true;

      if (!$scope.appState) $scope.appState = getAppState();

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
              $timeout(() => {
                $scope.$broadcast('render');
              });
            }
          }
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

      $scope.fetch();
    }
  };
});
