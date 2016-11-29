import moment from 'moment';
import UiModules from 'ui/modules';
import { once, clone, assign } from 'lodash';
import dateMath from '@elastic/datemath';

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

      // travel forward in time based on the interval between from and to
      $scope.forward = function () {
        assign(timefilter.time, timeNavigation.stepForward(timefilter.getBounds()));
      };

      // travel backwards in time based on the interval between from and to
      $scope.back = function () {
        assign(timefilter.time, timeNavigation.stepBackward(timefilter.getBounds()));
      };

      // zoom out, doubling the difference between start and end, keeping the same time range center
      $scope.zoomOut = function () {
        assign(timefilter.time, timeNavigation.zoomOut(timefilter.getBounds()));
      };

      // zoom in, halving the difference between start and end, keeping the same time range center
      $scope.zoomIn = function () {
        assign(timefilter.time, timeNavigation.zoomIn(timefilter.getBounds()));
      };
    },
  };
});
