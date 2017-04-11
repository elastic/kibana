import _ from 'lodash';
import { uiModules } from 'ui/modules';
import stateMonitorFactory from 'ui/state_management/state_monitor_factory';
import visualizeTemplate from 'ui/visualize/visualize.html';
import 'angular-sanitize';
import './visualization';

import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout, courier) {
  const notify = new Notifier({
    location: 'Visualize'
  });

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      showSpyPanel: '=?',
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

      // BWC
      $scope.vis.listeners.click = visualizeApi.events.filter;
      $scope.vis.listeners.brush = visualizeApi.events.brush;

      const stateMonitor = stateMonitorFactory.create($scope.appState);

      if (_.get($scope, 'savedVis.vis.type.requiresSearch')) {
        // todo: searchSource ... how it works ? can it be used for other than the courier ?
        // todo: in case not ... we should abstract this away in requestHandler
        $scope.savedVis.searchSource.onResults().then(function onResults(resp) {
          // todo: we should use responseHandler here to convert the results
          // todo: then we should update the observer ? to propagate this data to visualizations
          $scope.esResp = resp;

          return searchSource.onResults().then(onResults);
        }).catch(notify.fatal);
        $scope.savedVis.searchSource.onError(e => {
          $el.trigger('renderComplete');
          if (isTermSizeZeroError(e)) {
            return notify.error(
              `Your visualization ('${$scope.vis.title}') has an error: it has a term ` +
              `aggregation with a size of 0. Please set it to a number greater than 0 to resolve ` +
              `the error.`
            );
          }

          notify.error(e);
        }).catch(notify.fatal);

        $scope.fetch = function () {
          searchSource.set('filter', visualizeApi.queryFilter.getFilters());
          if (!$scope.appState.linked) searchSource.set('query', $scope.appState.query);

          // todo: this should use vis_type.requestHandler, which should receive the searchSource to use
          courier.fetch();
        };

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
