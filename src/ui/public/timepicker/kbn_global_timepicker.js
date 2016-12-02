import moment from 'moment';
import UiModules from 'ui/modules';
import { once, clone, assign } from 'lodash';

import toggleHtml from './kbn_global_timepicker.html';
import timeNavigation from './time_navigation';

UiModules
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
    link: ($scope) => {
      listenForUpdates($rootScope);

      $rootScope.timefilter = timefilter;
      $rootScope.toggleRefresh = () => {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };

      $scope.forward = function () {
        assign(timefilter.time, timeNavigation.stepForward(timefilter.getBounds()));
      };

      $scope.back = function () {
        assign(timefilter.time, timeNavigation.stepBackward(timefilter.getBounds()));
      };
    },
  };
});
