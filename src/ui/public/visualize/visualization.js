import { Observable } from 'rxjs/Rx';
import 'ui/visualize/spy';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { ResizeCheckerProvider } from 'ui/resize_checker';
import visualizationTemplate from 'ui/visualize/visualization.html';
import { getUpdateStatus } from 'ui/vis/update_status';
import 'angular-sanitize';
import { dispatchRenderComplete, dispatchRenderStart } from 'ui/render_complete';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualization', function (Notifier, SavedVis, indexPatterns, Private, config) {
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

        // Set the passed in uiState to the vis object. uiState reference should never be changed
        if (!$scope.uiState) $scope.uiState = $scope.vis.getUiState();
        else $scope.vis._setUiState($scope.uiState);


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

        const render$ = Observable.create(observer => {
          $scope.$on('render', () => {
            observer.next({
              vis: $scope.vis,
              visData: $scope.visData,
              container: getVisContainer(),
            });
          });
        });

        const success$ = render$
          .do(() => {
            dispatchRenderStart($el[0]);
          })
          .filter(({ vis, visData, container }) => vis && vis.initialized && container && (!vis.type.requiresSearch || visData))
          .do(({ vis }) => {
            $scope.addLegend = vis.params.addLegend;
            vis.refreshLegend++;
          })
          .debounceTime(100)
          .switchMap(async ({ vis, visData, container }) => {
            vis.size = [container.width(), container.height()];
            const status = getUpdateStatus($scope);
            const renderPromise = visualization.render(visData, status);
            $scope.$apply();
            return renderPromise;
          });

        const requestError$ = render$.filter(({ vis }) => vis.requestError);

        const renderSubscription = Observable.merge(success$, requestError$)
          .subscribe(() => {
            dispatchRenderComplete($el[0]);
          });

        $scope.$on('$destroy', () => {
          resizeChecker.destroy();
          visualization.destroy();
          renderSubscription.unsubscribe();
        });

        if (!$scope.vis.visualizeScope) {
          $scope.$watchGroup(['visData', 'vis.params'], () => {
            $scope.$emit('render');
          });

          resizeChecker.on('resize',  () => {
            $scope.$emit('render');
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
