import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import visualizationTemplate from 'ui/visualize/visualization.html';
import 'angular-sanitize';


uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualization', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout) {

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      vis: '=',
      visData: '=',
      uiState: '=?'
    },
    template: visualizationTemplate,
    link: function ($scope, $el, attr, renderCounter) {
      const minVisChartHeight = 180;

      $scope.showSpyPanel = $scope.vis && $scope.vis.showSpyPanel || false;

      function getter(selector) {
        return function () {
          const $sel = $el.find(selector);
          if ($sel.size()) return $sel;
        };
      }

      const getVisEl = getter('.visualize-chart');
      const getVisContainer = getter('.vis-container');
      const getSpyContainer = getter('.visualize-spy-container');

      // Show no results message when isZeroHits is true and it requires search
      $scope.showNoResultsMessage = function () {
        const requiresSearch = _.get($scope, 'vis.type.requiresSearch');
        const isZeroHits = _.get($scope,'visData.hits.total') === 0;
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

      const applyClassNames = function () {
        const $visEl = getVisContainer();
        const $spyEl = getSpyContainer();
        if (!$spyEl) return;

        const fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

        $visEl.toggleClass('spy-only', Boolean(fullSpy));
        $spyEl.toggleClass('only', Boolean(fullSpy));

        $timeout(function () {
          if (shouldHaveFullSpy()) {
            $visEl.addClass('spy-only');
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
      $scope.$watch('fullScreenSpy', applyClassNames);

      $scope.$watchCollection('spy.mode', function () {
        $scope.fullScreenSpy = shouldHaveFullSpy();
        applyClassNames();
      });


      const renderFunction = _.debounce(() => {
        $scope.vis.type.render($scope.vis, getVisEl(), $scope.uiState, $scope.visData);
        $scope.$apply();
      }, 100);

      $scope.$on('render', () => {
        if (!$scope.visData || !$scope.vis) {
          return;
        }

        renderFunction();
      });

      $scope.$watch('visData', (newVal) => {
        if (!newVal) return;
        renderFunction();
      });
    }
  };
});
