import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { ResizeCheckerProvider } from 'ui/resize_checker';
import visualizationTemplate from 'ui/visualize/visualization.html';
import { getUpdateStatus } from 'ui/vis/update_status';
import { PersistedState } from 'ui/persisted_state';
import 'angular-sanitize';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualization', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout) {
    const ResizeChecker = Private(ResizeCheckerProvider);

    return {
      restrict: 'E',
      require: '?renderCounter',
      scope: {
        showSpyPanel: '=?',
        vis: '=',
        visData: '=',
        uiState: '=?',
        searchSource: '='
      },
      template: visualizationTemplate,
      link: function ($scope, $el) {
        const resizeChecker = new ResizeChecker($el);

        //todo: lets make this a simple function call.
        const getVisEl = jQueryGetter('.visualize-chart');
        const getVisContainer = jQueryGetter('.vis-container');

        $scope.addLegend = false;

        // Set the passed in uiState to the vis object, so we don't require any
        // users of the <visualization/> directive to manually set the uiState.
        if (!$scope.uiState) $scope.uiState = new PersistedState({});
        $scope.vis.setUiState($scope.uiState);
        // Whenever the uiState changed, that the visualization should use,
        // attach it to the actual Vis class.
        $scope.$watch('uiState', (uiState) => {
          $scope.vis.setUiState(uiState);
        });

        // Show no results message when isZeroHits is true and it requires search
        $scope.showNoResultsMessage = function () {
          const requiresSearch = _.get($scope, 'vis.type.requiresSearch');
          const isZeroHits = _.get($scope, 'visData.hits.total') === 0;
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

        $scope.visElement = getVisContainer();

        const loadingDelay = config.get('visualization:loadingDelay');
        $scope.loadingStyle = {
          '-webkit-transition-delay': loadingDelay,
          'transition-delay': loadingDelay
        };

        const Visualization = $scope.vis.type.visualization;
        const visualization = new Visualization(getVisEl()[0], $scope.vis);

        $scope.vis.initialized = true;

        const renderFunction = _.debounce(() => {
          const container = getVisContainer();
          if (!container) return;
          $scope.vis.size = [container.width(), container.height()];
          const status = getUpdateStatus($scope);
          visualization.render($scope.visData, status)
            .then(() => {
            // renderComplete
              $scope.$emit('renderComplete');
              $el.trigger('renderComplete');
            });
          $scope.$apply();
        }, 100);

        $scope.$on('render', () => {
          if (!$scope.vis || !$scope.vis.initialized || ($scope.vis.type.requiresSearch && !$scope.visData)) {
            return;
          }
          $scope.addLegend = $scope.vis.params.addLegend;
          $scope.vis.refreshLegend++;
          $timeout(renderFunction);
        });

        $scope.$on('$destroy', () => {
          resizeChecker.destroy();
          visualization.destroy();
        });

        if (!$scope.vis.visualizeScope) {
          $scope.$watchGroup(['visData', 'vis.params'], () => {
            $scope.$emit('render');
          });

          // the very first resize event is the initialization, which we can safely ignore.
          // however, we also want to debounce the resize event, and not miss a resize event
          // if it occurs within the first 200ms window
          const resizeFunc = _.debounce(() => {
            $scope.$emit('render');
          }, 200);

          let resizeInit = false;
          resizeChecker.on('resize',  () => {
            if (!resizeInit) return resizeInit = true;
            resizeFunc();
          });
        }

        function jQueryGetter(selector) {
          return function () {
            const $sel = $el.find(selector);
            if ($sel.length) return $sel;
          };
        }
      }
    };
  });
