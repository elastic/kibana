import { Observable } from 'rxjs/Rx';
import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
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
  .directive('visualization', function ($timeout, Notifier, SavedVis, indexPatterns, Private, config) {
    const ResizeChecker = Private(ResizeCheckerProvider);

    return {
      restrict: 'E',
      require: '?renderCounter',
      scope: {
        showSpyPanel: '=?',
        vis: '=',
        visData: '=',
        uiState: '=?',
        // If set to true (default) the visualization directive will listen for
        // several changes in the data and uiState to trigger a render. If set to
        // false (boolean value, not a falsy value), this directive won't listen
        // for any changes and require to be notified by the 'render' event broadcasted
        // to its scope, that it needs to rerender this. Usually when using this as
        // a consumer you don't want to change the default behavior.
        listenOnChange: '<',
        searchSource: '='
      },
      template: visualizationTemplate,
      link: function ($scope, $el) {
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
        }).share();

        const success$ = render$
          .do(() => {
            dispatchRenderStart($el[0]);
          })
          .filter(({ vis, visData, container }) => vis && vis.initialized && container && (!vis.type.requiresSearch || visData))
          .debounceTime(100)
          .switchMap(async ({ vis, visData, container }) => {
            $scope.addLegend = vis.params.addLegend;
            vis.refreshLegend++;
            // We need to wait one digest cycle for the legend to render, before
            // we want to render the chart, so it know about the legend size.
            await new Promise(resolve => $timeout(resolve));
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
          visualization.destroy();
          renderSubscription.unsubscribe();
        });

        // Listen on changes to trigger a render if listenOnChange is not false
        // i.e. true or has not been used (undefined in that case)
        if ($scope.listenOnChange !== false) {
          const onChangeListener = () => {
            $scope.$emit('render');
          };

          $scope.$watchGroup(['visData', 'vis.params'], onChangeListener);

          const resizeChecker = new ResizeChecker($el);
          resizeChecker.on('resize', () => {
            $scope.$emit('render');
          });

          $scope.uiState.on('change', onChangeListener);
          $scope.$on('$destroy', () => {
            resizeChecker.destroy();
            $scope.uiState.off('change', onChangeListener);
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
