import moment from 'moment';
import UiModules from 'ui/modules';
import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import { once, clone } from 'lodash';
import dateMath from '@elastic/datemath';

import toggleHtml from './kbn_global_timepicker.html';

UiModules
.get('kibana')
.directive('kbnGlobalTimepicker', (timefilter, globalState, $rootScope, config) => {
  const listenForUpdates = once($scope => {
    $scope.$listen(timefilter, 'update', (newVal, oldVal) => {
      globalState.time = clone(timefilter.time);
      globalState.refreshInterval = clone(timefilter.refreshInterval);
      globalState.save();
    });
  });

  return {
    template: toggleHtml,
    replace: true,
    link: ($scope, $el, attrs) => {
      listenForUpdates($rootScope);

      $rootScope.timefilter = timefilter;
      $rootScope.toggleRefresh = () => {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };

      // travel forward in time based on the interval between from and to
      $scope.forward = function () {
        const time = getFromTo();
        const diff = time.to.diff(time.from);
        const origTo = time.to.toISOString();

        time.to.add(diff, 'milliseconds');
        timefilter.time.from = origTo;
        timefilter.time.to = time.to.toISOString();
      };

      // travel backwards in time based on the interval between from and to
      $scope.back = function () {
        const time = getFromTo();
        const diff = time.to.diff(time.from);
        const origFrom = time.from.toISOString();

        time.from.subtract(diff, 'milliseconds');
        timefilter.time.from = time.from.toISOString();
        timefilter.time.to = origFrom;
      };

      // zoom out, doubling the difference between start and end, keeping the same time range center
      $scope.zoomOut = function () {
        const time = getFromTo();
        const from = time.from.unix() * 1000;
        const to = time.to.unix() * 1000;

        const diff = Math.floor((to - from) / 2);

        timefilter.time.from = moment(from - diff).toISOString();
        timefilter.time.to = moment(to + diff).toISOString();
      };

      // zoom in, halving the difference between start and end, keeping the same time range center
      $scope.zoomIn = function () {
        const time = getFromTo();
        const from = time.from.unix() * 1000;
        const to = time.to.unix() * 1000;

        const diff = Math.floor((to - from) / 4);

        timefilter.time.from = moment(from + diff).toISOString();
        timefilter.time.to = moment(to - diff).toISOString();
      };

      // find the from and to values from the timefilter
      // if a quick or relative mode has been selected, work out the
      // absolute times and then change the mode to absolute
      function getFromTo() {
        if (timefilter.time.mode === 'absolute') {
          return {
            to:   moment(timefilter.time.to),
            from: moment(timefilter.time.from)
          };
        } else {
          timefilter.time.mode = 'absolute';
          return {
            to:   dateMath.parse(timefilter.time.to, true),
            from: dateMath.parse(timefilter.time.from)
          };
        }
      }

    },
  };
});
