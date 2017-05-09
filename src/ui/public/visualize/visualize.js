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
.directive('visualize', function (Notifier, SavedVis, indexPatterns, Private) {
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
      if (_.isUndefined($scope.showSpyPanel)) {
        $scope.showSpyPanel = true;
      }

      $scope.vis = $scope.savedVis.vis;

      const visualizeApi = $scope.savedVis.vis.api;
      const searchSource = $scope.savedVis.searchSource;

      // get request handler from registry (this should actually happen only once not on every fetch)
      const requestHandler = getHandler(requestHandlers, $scope.vis.type.requestHandler);
      const responseHandler = getHandler(responseHandlers, $scope.vis.type.responseHandler);

      // BWC
      $scope.vis.listeners.click = visualizeApi.events.filter;
      $scope.vis.listeners.brush = visualizeApi.events.brush;

      $scope.fetch = function () {
        searchSource.set('filter', visualizeApi.queryFilter.getFilters());
        if (!$scope.appState.linked) searchSource.set('query', $scope.appState.query);

        requestHandler(searchSource)
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
            return resp;
          });
      };

      const stateMonitor = stateMonitorFactory.create($scope.appState);

      if (_.get($scope, 'savedVis.vis.type.requiresSearch')) {
        let currentAggJson = JSON.stringify($scope.appState.vis.aggs);
        stateMonitor.onChange((status, type, keys) => {
          if (keys[0] === 'query') $scope.fetch();
          if (keys[0] === 'vis') {
            const isAggregationsChanged = JSON.stringify($scope.appState.vis.aggs) !== currentAggJson;
            if (isAggregationsChanged) {
              $scope.fetch();
            }
            currentAggJson = JSON.stringify($scope.appState.vis.aggs);
          }
        });
        $scope.$listen(visualizeApi.queryFilter, 'fetch', $scope.fetch);
        $scope.$listen(visualizeApi.timeFilter, 'fetch', $scope.fetch);

        $scope.fetch();
      }
    }
  };
});
