import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import stateMonitorFactory from 'ui/state_management/state_monitor_factory';
import visualizeTemplate from 'ui/visualize/visualize.html';
import 'angular-sanitize';

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
    link: function ($scope, $el, attr, renderCounter) {
      const minVisChartHeight = 180;

      if (_.isUndefined($scope.showSpyPanel)) {
        $scope.showSpyPanel = true;
      }

      function getter(selector) {
        return function () {
          const $sel = $el.find(selector);
          if ($sel.size()) return $sel;
        };
      }

      $scope.vis = $scope.savedVis.vis;

      const visualizeApi = $scope.savedVis.vis.api;
      const searchSource = $scope.savedVis.searchSource;

      // BWC
      $scope.vis.listeners.click = visualizeApi.events.filter;
      $scope.vis.listeners.brush = visualizeApi.events.brush;

      const getVisEl = getter('[data-visualize-chart]');
      const getVisContainer = getter('[data-visualize-chart-container]');
      const getSpyContainer = getter('[data-spy-content-container]');

      // Show no results message when isZeroHits is true and it requires search
      $scope.showNoResultsMessage = function () {
        const requiresSearch = _.get($scope, 'vis.type.requiresSearch');
        const isZeroHits = false; //_.get($scope,'esResp.hits.total') === 0;
        const shouldShowMessage = !_.get($scope, 'vis.params.handleNoResults');

        return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
      };

      const legendPositionToVisContainerClassMap = {
        top: 'vis-container--legend-top',
        bottom: 'vis-container--legend-bottom',
        left: 'vis-container--legend-left',
        right: 'vis-container--legend-right',
      };

      $scope.getVisContainerClasses = function () {
        return legendPositionToVisContainerClassMap[$scope.vis.params.legendPosition];
      };

      if (renderCounter && !$scope.vis.implementsRenderComplete()) {
        renderCounter.disable();
      }

      $scope.spy = {};
      $scope.spy.mode = ($scope.uiState) ? $scope.uiState.get('spy.mode', {}) : {};

      const updateSpy = function () {
        const $visContainer = getVisContainer();
        const $spyEl = getSpyContainer();
        if (!$spyEl) return;

        const fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

        $visContainer.toggleClass('spy-only', Boolean(fullSpy));
        $spyEl.toggleClass('only', Boolean(fullSpy));

        $timeout(function () {
          if (shouldHaveFullSpy()) {
            $visContainer.addClass('spy-only');
            $spyEl.addClass('only');
          }
        }, 0);
      };

      const loadingDelay = config.get('visualization:loadingDelay');
      $scope.loadingStyle = {
        '-webkit-transition-delay': loadingDelay,
        'transition-delay': loadingDelay
      };

      function shouldHaveFullSpy() {
        const $visEl = getVisEl();
        if (!$visEl) return;

        return ($visEl.height() < minVisChartHeight)
          && _.get($scope.spy, 'mode.fill')
          && _.get($scope.spy, 'mode.name');
      }

      // spy watchers
      $scope.$watch('fullScreenSpy', updateSpy);

      $scope.$watchCollection('spy.mode', function () {
        $scope.fullScreenSpy = shouldHaveFullSpy();
        updateSpy();
      });

      const stateMonitor = stateMonitorFactory.create($scope.appState);
      $scope.renderbot = $scope.vis.type.createRenderbot($scope.vis, getVisEl(), $scope.uiState);

      if (_.get($scope, 'savedVis.vis.type.requiresSearch')) {
        $scope.savedVis.searchSource.onResults().then(function onResults(resp) {
          $scope.esResp = resp;
          $scope.renderbot.render(resp);
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

          courier.fetch();
        };

        let currentAggJson = JSON.stringify($scope.appState.vis.aggs);
        stateMonitor.onChange((status, type, keys) => {
          if (keys[0] === 'query') $scope.fetch();
          if (keys[0] === 'vis') {
            const isAggregationsChanged = JSON.stringify($scope.appState.vis.aggs) !== currentAggJson;
            if (isAggregationsChanged) $scope.fetch();
            else {
              $scope.renderbot.render($scope.esResp);
            }
            currentAggJson = JSON.stringify($scope.appState.vis.aggs);
          }
        });
        $scope.$listen(visualizeApi.queryFilter, 'fetch', $scope.fetch);
        $scope.$listen(visualizeApi.timeFilter, 'fetch', $scope.fetch);

        $scope.fetch();
      }

      $scope.$on('$destroy', function () {
        if ($scope.renderbot) {
          $el.off('renderComplete');
          $scope.renderbot.destroy();
        }
      });
    }
  };
});
