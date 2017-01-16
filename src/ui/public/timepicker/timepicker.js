import html from 'ui/timepicker/timepicker.html';
import _ from 'lodash';
import dateMath from '@elastic/datemath';
import moment from 'moment';
import Notifier from 'ui/notify/notifier';
import 'ui/timepicker/timepicker.less';
import 'ui/directives/input_datetime';
import 'ui/directives/inequality';
import 'ui/timepicker/quick_ranges';
import 'ui/timepicker/refresh_intervals';
import 'ui/timepicker/time_units';
import 'ui/timepicker/kbn_global_timepicker';
import uiModules from 'ui/modules';
const module = uiModules.get('ui/timepicker');
const notify = new Notifier({
  location: 'timepicker',
});

module.directive('kbnTimepicker', function (quickRanges, timeUnits, refreshIntervals) {
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '=',
      mode: '=',
      interval: '=',
      activeTab: '=',
      onFilterSelect: '&',
      onIntervalSelect: '&'
    },
    template: html,
    controller: function ($scope) {
      $scope.format = 'MMMM Do YYYY, HH:mm:ss.SSS';
      $scope.modes = ['quick', 'relative', 'absolute'];
      $scope.activeTab = $scope.activeTab || 'filter';

      if (_.isUndefined($scope.mode)) $scope.mode = 'quick';

      // use internalMode as an ephemeral version that is temporary until we
      // select a filter and it is applied
      $scope.internalMode = $scope.mode;
      function selectFilter(from, to) {
        // export our current mode as the external mode
        $scope.mode = $scope.internalMode;
        $scope.onFilterSelect({ from, to, mode: $scope.mode });
      }

      $scope.quickLists = _(quickRanges).groupBy('section').values().value();
      $scope.refreshLists = _(refreshIntervals).groupBy('section').values().value();

      $scope.relative = {
        count: 1,
        unit: 'm',
        preview: undefined,
        round: false
      };

      $scope.absolute = {
        from: moment(),
        to: moment()
      };

      $scope.units = timeUnits;

      $scope.relativeOptions = [
        { text: 'Seconds ago', value: 's' },
        { text: 'Minutes ago', value: 'm' },
        { text: 'Hours ago', value: 'h' },
        { text: 'Days ago', value: 'd' },
        { text: 'Weeks ago', value: 'w' },
        { text: 'Months ago', value: 'M' },
        { text: 'Years ago', value: 'y' },
      ];

      $scope.$watch('from', function (date) {
        if (moment.isMoment(date) && $scope.internalMode === 'absolute') {
          $scope.absolute.from = date;
        }
      });

      $scope.$watch('to', function (date) {
        if (moment.isMoment(date) && $scope.internalMode === 'absolute') {
          $scope.absolute.to = date;
        }
      });

      $scope.$watch('absolute.from', function (date) {
        if (_.isDate(date)) $scope.absolute.from = moment(date);
      });

      $scope.$watch('absolute.to', function (date) {
        if (_.isDate(date)) $scope.absolute.to = moment(date);
      });

      $scope.setMode = function (thisMode) {
        switch (thisMode) {
          case 'quick':
            break;
          case 'relative':
            const fromParts = $scope.from.toString().split('-');
            let relativeParts = [];

            // Try to parse the relative time, if we can't use moment duration to guestimate
            if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
              relativeParts = fromParts[1].match(/([0-9]+)([smhdwMy]).*/);
            }
            if (relativeParts[1] && relativeParts[2]) {
              $scope.relative.count = parseInt(relativeParts[1], 10);
              $scope.relative.unit = relativeParts[2];
            } else {
              const duration = moment.duration(moment().diff(dateMath.parse($scope.from)));
              const units = _.pluck(_.clone($scope.relativeOptions).reverse(), 'value');
              if ($scope.from.toString().split('/')[1]) $scope.relative.round = true;
              for (let i = 0; i < units.length; i++) {
                const as = duration.as(units[i]);
                if (as > 1) {
                  $scope.relative.count = Math.round(as);
                  $scope.relative.unit = units[i];
                  break;
                }
              }
            }

            if ($scope.from.toString().split('/')[1]) $scope.relative.round = true;
            $scope.formatRelative();

            break;
          case 'absolute':
            $scope.absolute.from = dateMath.parse($scope.from || moment().subtract(15, 'minutes'));
            $scope.absolute.to = dateMath.parse($scope.to || moment(), true);
            break;
        }

        $scope.internalMode = thisMode;
      };

      $scope.setQuick = function (from, to) {
        selectFilter(from, to);
      };

      $scope.setToNow = function () {
        $scope.absolute.to = moment();
      };

      $scope.formatRelative = function () {
        const parsed = dateMath.parse(getRelativeString());
        $scope.relative.preview =  parsed ? parsed.format($scope.format) : undefined;
        return parsed;
      };

      $scope.applyRelative = function () {
        selectFilter(getRelativeString(), 'now');
      };

      function getRelativeString() {
        return 'now-' + $scope.relative.count + $scope.relative.unit + ($scope.relative.round ? '/' + $scope.relative.unit : '');
      }

      $scope.applyAbsolute = function () {
        selectFilter(moment($scope.absolute.from), moment($scope.absolute.to));
      };

      $scope.setRefreshInterval = function (interval) {
        interval = _.clone(interval || {});
        notify.log('before: ' + interval.pause);
        interval.pause = (interval.pause == null || interval.pause === false) ? false : true;

        notify.log('after: ' + interval.pause);

        $scope.onIntervalSelect({ interval });
      };

      $scope.setMode($scope.internalMode);
    }
  };
});
