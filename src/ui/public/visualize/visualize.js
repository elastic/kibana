define(function (require) {
  require('ui/modules')
  .get('kibana/directive')
  .directive('visualize', function (Notifier, SavedVis, indexPatterns, Private, config, timefilter) {

    require('ui/visualize/spy');
    require('ui/visualize/visualize.less');
    var $ = require('jquery');
    var _ = require('lodash');
    var visTypes = Private(require('ui/registry/vis_types'));

    var notify = new Notifier({
      location: 'Visualize'
    });

    return {
      restrict: 'E',
      scope : {
        vis: '=',
        editableVis: '=?',
        esResp: '=?',
        searchSource: '=?'
      },
      template: require('ui/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        var chart; // set in "vis" watcher
        var minVisChartHeight = 180;

        function getter(selector) {
          return function () {
            var $sel = $el.find(selector);
            if ($sel.size()) return $sel;
          };
        }

        var getVisEl = getter('.visualize-chart');
        var getSpyEl = getter('visualize-spy');

        $scope.spy = {mode: false};
        $scope.fullScreenSpy = false;

        $scope.applyLoadingClass = false;

        // get the seconds value from config
        var delay = parseInt(config.get('dashboard:loadingIndicatorDelay'), 10);
        var loadingEnabled = delay !== -1;

        var loadingIndicator = function () {

          var loadingIndicatorDelay = 1000 * delay;
          var debouncedApplyLoading;

          var fetchingChanged = function () {
            var fetching = $scope.vis.type.requiresSearch && !!$scope.searchSource.activeFetchCount;

            if (!fetching && debouncedApplyLoading) {
              debouncedApplyLoading.cancel();
              $scope.applyLoadingClass = false;
            }

            if (fetching) {
              debouncedApplyLoading();
            }
          };

          $scope.$watchMulti([
            'vis.type.requiresSearch',
            'searchSource.activeFetchCount'
          ], fetchingChanged);

          if (!debouncedApplyLoading) {
            debouncedApplyLoading = _.debounce(function () {
              $scope.applyLoadingClass = true;
            },
            loadingIndicatorDelay,
            { 'leading': false, 'trailing': true });
          }
        };

        if (loadingEnabled) {
          loadingIndicator();
        }

        var applyClassNames = function () {
          var $spyEl = getSpyEl();
          var $visEl = getVisEl();
          var fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

          // external
          $el.toggleClass('only-visualization', !$scope.spy.mode);
          $el.toggleClass('visualization-and-spy', $scope.spy.mode && !fullSpy);
          $el.toggleClass('only-spy', Boolean(fullSpy));
          if ($spyEl) $spyEl.toggleClass('only', Boolean(fullSpy));

          // internal
          $visEl.toggleClass('spy-visible', Boolean($scope.spy.mode));
          $visEl.toggleClass('spy-only', Boolean(fullSpy));
        };

        // we need to wait for some watchers to fire at least once
        // before we are "ready", this manages that
        var prereq = (function () {
          var fns = [];

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

        $scope.$watch('fullScreenSpy', applyClassNames);
        $scope.$watchCollection('spy.mode', function (spyMode, oldSpyMode) {
          var $visEl = getVisEl();
          if (!$visEl) return;

          // if the spy has been opened, check chart height
          if (spyMode && !oldSpyMode) {
            $scope.fullScreenSpy = $visEl.height() < minVisChartHeight;
          }
          applyClassNames();
        });

        $scope.$watch('vis', prereq(function (vis, oldVis) {
          var $visEl = getVisEl();
          if (!$visEl) return;

          if (!attr.editableVis) {
            $scope.editableVis = vis;
          }

          if (oldVis) $scope.renderbot = null;
          if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl);
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
