import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import visualizeTemplate from 'ui/visualize/visualize.html';
import 'angular-sanitize';

import {
  isTermSizeZeroError,
} from '../elasticsearch_errors';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout) {
  const notify = new Notifier({
    location: 'Visualize'
  });

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      showSpyPanel: '=?',
      vis: '=',
      uiState: '=?',
      searchSource: '=?',
      editableVis: '=?',
      esResp: '=?',
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

      const getVisEl = getter('[data-visualize-chart]');
      const getVisContainer = getter('[data-visualize-chart-container]');
      const getSpyContainer = getter('[data-spy-content-container]');

      // Show no results message when isZeroHits is true and it requires search
      $scope.showNoResultsMessage = function () {
        const requiresSearch = _.get($scope, 'vis.type.requiresSearch');
        const isZeroHits = _.get($scope,'esResp.hits.total') === 0;
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

      // we need to wait for some watchers to fire at least once
      // before we are "ready", this manages that
      const prereq = (function () {
        const fns = [];

        return function register(fn) {
          fns.push(fn);

          return function () {
            fn.apply(this, arguments);

            if (fns.length) {
              _.pull(fns, fn);
              if (!fns.length) {
                $scope.$root.$broadcast('ready:vis');
              }
            }
          };
        };
      }());

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

      function updateVisAggs() {
        const enabledState = $scope.editableVis.getEnabledState();
        const shouldUpdate = enabledState.aggs.length !== $scope.vis.aggs.length;

        if (shouldUpdate) {
          $scope.vis.setState(enabledState);
          $scope.editableVis.dirty = false;
        }
      }

      $scope.$watch('vis', prereq(function (vis, oldVis) {
        const $visEl = getVisEl();
        if (!$visEl) return;

        if (!attr.editableVis) {
          $scope.editableVis = vis;
        }

        if (oldVis) $scope.renderbot = null;
        if (vis) {
          $scope.renderbot = vis.type.createRenderbot(vis, $visEl, $scope.uiState);
        }
      }));

      $scope.$watchCollection('vis.params', prereq(function () {
        updateVisAggs();
        if ($scope.renderbot) $scope.renderbot.updateParams();
      }));

      if (_.get($scope, 'vis.type.requiresSearch')) {
        function onResults(resp) {
          // if ($scope.searchSource !== searchSource) return;
          $scope.esResp = resp;
          return $scope.searchSource.onResults().then(onResults);
        }

        function startSearching() {
          $scope.searchSource.onResults()
            .then(onResults)
            .catch(error => {
              $el.trigger('renderComplete');
              if (isTermSizeZeroError(error)) {
                return notify.error(
                  `Your visualization ('${$scope.vis.title}') has an error: it has a term ` +
                  `aggregation with a size of 0. Please set it to a number greater than 0 to resolve ` +
                  `the error.`
                );
              }

              notify.error(error);
              startSearching();
            });
        }

        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!searchSource || attr.esResp) return;

          startSearching();
        }));
      }

      $scope.$watch('esResp', prereq(function (resp) {
        if (!resp) return;
        $scope.renderbot.render(resp);
      }));

      $scope.$watch('renderbot', function (newRenderbot, oldRenderbot) {
        if (oldRenderbot && newRenderbot !== oldRenderbot) {
          oldRenderbot.destroy();
        }
      });

      $scope.$on('$destroy', function () {
        if ($scope.renderbot) {
          $el.off('renderComplete');
          $scope.renderbot.destroy();
        }
      });
    }
  };
});
