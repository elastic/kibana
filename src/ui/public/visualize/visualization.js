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
        const minVisChartHeight = 180;
        const resizeChecker = new ResizeChecker($el);

        //todo: lets make this a simple function call.
        const getVisEl = jQueryGetter('.visualize-chart');
        const getVisContainer = jQueryGetter('.vis-container');
        const getSpyContainer = jQueryGetter('.visualize-spy-container');

        $scope.addLegend = false;

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

        const Visualization = $scope.vis.type.visualization;
        const visualization = new Visualization(getVisEl()[0], $scope.vis);

        $scope.vis.initialized = true;

        const dispatchCustomEvent = (name) => {
          // we're using the native events so that we aren't tied to the jQuery custom events,
          // otherwise we have to use jQuery(element).on(...) because jQuery's events sit on top
          // of the native events per https://github.com/jquery/jquery/issues/2476
          $el[0].dispatchEvent(new CustomEvent(name, { bubbles: true }));
        };

        const render$ = Observable.create(observer => {
          $scope.$on('render', () => {
            observer.next({
              vis: $scope.vis,
              visData: $scope.visData
            });
          });
        });

        const unsubscribeRender = render$
          .filter(({ vis, visData }) => vis && vis.initialized && (!vis.type.requiresSearch || visData))
          .do(({ vis }) => {
            $scope.addLegend = vis.params.addLegend;
            vis.refreshLegend++;
          })
          .do(() => {
            dispatchCustomEvent('renderStart');
          })
          .debounceTime(100)
          .switchMap(async () => {
            const container = getVisContainer();
            if (!container) return;

            $scope.vis.size = [container.width(), container.height()];
            const status = getUpdateStatus($scope);
            await visualization.render($scope.visData, status);
          })
          .do(() => {
            $scope.$emit('renderComplete');
            dispatchCustomEvent('renderComplete');
          })
          .subscribe(() => {
            $scope.$apply();
          });

        $scope.$on('$destroy', () => {
          resizeChecker.destroy();
          visualization.destroy();
          unsubscribeRender();
        });

        if (!$scope.vis.visualizeScope) {
          $scope.$watchGroup(['visData', 'vis.params'], () => {
            $scope.$emit('render');
          });

          let resizeInit = false;
          resizeChecker.on('resize',  () => {
            // the very first resize event is the initialization, which we can safely ignore.
            if (!resizeInit) return resizeInit = true;
            $scope.$emit('render');
          });
        }

        function jQueryGetter(selector) {
          return function () {
            const $sel = $el.find(selector);
            if ($sel.size()) return $sel;
          };
        }
      }
    };
  });
