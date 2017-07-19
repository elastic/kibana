import { uiModules } from 'ui/modules';
import { once, clone } from 'lodash';

import toggleHtml from './kbn_global_timepicker.html';
import { timeNavigation } from './time_navigation';

uiModules
.get('kibana')
.directive('kbnGlobalTimepicker', (timefilter, globalState, $rootScope) => {
  const listenForUpdates = once($scope => {
    $scope.$listen(timefilter, 'update', () => {
      globalState.time = clone(timefilter.time);
      globalState.refreshInterval = clone(timefilter.refreshInterval);
      globalState.save();
    });
  });

  return {
    template: toggleHtml,
    replace: true,
    require: '^kbnTopNav',
    link: ($scope, element, attributes, kbnTopNav) => {
      listenForUpdates($rootScope);

      $rootScope.timefilter = timefilter;
      $rootScope.toggleRefresh = () => {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };

      $scope.forward = function () {
        timefilter.time = timeNavigation.stepForward(timefilter.getBounds());
      };

      $scope.back = function () {
        timefilter.time = timeNavigation.stepBackward(timefilter.getBounds());
      };

      $scope.updateFilter = function (from, to) {
        timefilter.time.from = from;
        timefilter.time.to = to;
        kbnTopNav.close('filter');
      };

      $scope.updateInterval = function (interval) {
        timefilter.refreshInterval = interval;
        kbnTopNav.close('interval');
      };
    },
  };
});
