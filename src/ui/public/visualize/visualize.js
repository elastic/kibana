define(function (require) {
  require('angular-sanitize');

  require('ui/modules')
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, config, $timeout) {

    require('ui/visualize/spy');
    require('ui/visualize/visualize.less');
    require('ui/visualize/visualize_legend');

    let $ = require('jquery');
    let _ = require('lodash');
    let visTypes = Private(require('ui/registry/vis_types'));

    let notify = new Notifier({
      location: 'Visualize'
    });

    return {
      restrict: 'E',
      scope : {
        showSpyPanel: '=?',
        vis: '=',
        uiState: '=?',
        searchSource: '=?',
        editableVis: '=?',
        esResp: '=?',
      },
      template: require('ui/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        let chart; // set in "vis" watcher
        let minVisChartHeight = 180;

        if (_.isUndefined($scope.showSpyPanel)) {
          $scope.showSpyPanel = true;
        }

        function getter(selector) {
          return function () {
            let $sel = $el.find(selector);
            if ($sel.size()) return $sel;
          };
        }

        let getVisEl = getter('.visualize-chart');
        let getVisContainer = getter('.vis-container');

        // Show no results message when isZeroHits is true and it requires search
        $scope.showNoResultsMessage = function () {
          let requiresSearch = _.get($scope, 'vis.type.requiresSearch');
          let isZeroHits = _.get($scope,'esResp.hits.total') === 0;
          let shouldShowMessage = !_.get($scope, 'vis.params.handleNoResults');

          return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
        };

        $scope.fullScreenSpy = false;
        $scope.spy = {};
        $scope.spy.mode = ($scope.uiState) ? $scope.uiState.get('spy.mode', {}) : {};

        let applyClassNames = function () {
          let $visEl = getVisContainer();
          let fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

          $visEl.toggleClass('spy-only', Boolean(fullSpy));

          $timeout(function () {
            if (shouldHaveFullSpy()) {
              $visEl.addClass('spy-only');
            };
          }, 0);
        };

        // we need to wait for some watchers to fire at least once
        // before we are "ready", this manages that
        let prereq = (function () {
          let fns = [];

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

        let loadingDelay = config.get('visualization:loadingDelay');
        $scope.loadingStyle = {
          '-webkit-transition-delay': loadingDelay,
          'transition-delay': loadingDelay
        };

        function shouldHaveFullSpy() {
          let $visEl = getVisEl();
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

        $scope.$watch('vis', prereq(function (vis, oldVis) {
          let $visEl = getVisEl();
          if (!$visEl) return;

          if (!attr.editableVis) {
            $scope.editableVis = vis;
          }

          if (oldVis) $scope.renderbot = null;
          if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl, $scope.uiState);
        }));

        $scope.$watchCollection('vis.params', prereq(function () {
          if ($scope.renderbot) $scope.renderbot.updateParams();
        }));

        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!searchSource || attr.esResp) return;

          // TODO: we need to have some way to clean up result requests
          searchSource.onResults().then(function onResults(resp) {
            if ($scope.searchSource !== searchSource) return;

            $scope.esResp = resp;

            return searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          searchSource.onError(notify.error).catch(notify.fatal);
        }));

        $scope.$watch('esResp', prereq(function (resp, prevResp) {
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
            $scope.renderbot.destroy();
          }
        });
      }
    };
  });
});
