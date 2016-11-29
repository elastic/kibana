import moment from 'moment';
import UiModules from 'ui/modules';
import { once, clone } from 'lodash';
import dateMath from '@elastic/datemath';

import toggleHtml from './kbn_global_timepicker.html';

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
        const time = timefilter.getBounds();
        const diff = time.max.diff(time.min);
        timefilter.time.from = time.max.toISOString();
        timefilter.time.to = time.max.add(diff, 'milliseconds').toISOString();
      };

      // travel backwards in time based on the interval between from and to
      $scope.back = function () {
        const time = timefilter.getBounds();
        const diff = time.max.diff(time.min);
        timefilter.time.to = time.min.toISOString();
        timefilter.time.from = time.min.subtract(diff, 'milliseconds').toISOString();
      };

      // zoom out, doubling the difference between start and end, keeping the same time range center
      $scope.zoomOut = function () {
        const time = timefilter.getBounds();
        const diff = time.max.diff(time.min);
        timefilter.time.from = time.min.subtract(diff / 2, 'milliseconds').toISOString();
        timefilter.time.to = time.max.add(diff / 2, 'milliseconds').toISOString();
      };

      // zoom in, halving the difference between start and end, keeping the same time range center
      $scope.zoomIn = function () {
        const time = timefilter.getBounds();
        const diff = time.max.diff(time.min);
        timefilter.time.from = time.min.add(diff / 4, 'milliseconds').toISOString();
        timefilter.time.to = time.max.subtract(diff / 4, 'milliseconds').toISOString();
      };
    },
  };
});
