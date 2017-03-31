import html from 'ui/timepicker/timepicker.html';
import _ from 'lodash';
import { relativeOptions } from './relative_options';
import { parseRelativeParts } from './parse_relative_parts';
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

      $scope.quickLists = _(quickRanges).groupBy('section').values().value();
      $scope.refreshLists = _(refreshIntervals).groupBy('section').values().value();

      $scope.relative = {
        from: {
          count: 1,
          unit: 'm',
          preview: undefined,
          round: false
        },
        to: {
          count: 0,
          unit: 's',
          preview: undefined,
          round: false
        }
      };

      $scope.absolute = {
        from: moment(),
        to: moment()
      };

      $scope.units = timeUnits;

      $scope.relativeOptions = relativeOptions;

      $scope.$watch('from', function (date) {
        if (moment.isMoment(date) && $scope.mode === 'absolute') {
          $scope.absolute.from = date;
        }
      });

      $scope.$watch('to', function (date) {
        if (moment.isMoment(date) && $scope.mode === 'absolute') {
          $scope.absolute.to = date;
        }
      });

      $scope.pickFromDate = function (date) {
        if (!date) return $scope.absolute.from;
        date.setHours(0, 0, 0, 0); // Start of day
        return $scope.absolute.from = moment(date);
      };

      $scope.pickToDate = function (date) {
        if (!date) return $scope.absolute.to;
        date.setHours(23, 59, 59, 999); // End of day
        return $scope.absolute.to = moment(date);
      };

      $scope.setMode = function (thisMode) {
        switch (thisMode) {
          case 'quick':
            break;
          case 'relative':
            $scope.relative = parseRelativeParts($scope.from, $scope.to);
            $scope.formatRelative('from');
            $scope.formatRelative('to');
            break;
          case 'absolute':
            $scope.absolute.from = dateMath.parse($scope.from || moment().subtract(15, 'minutes'));
            $scope.absolute.to = dateMath.parse($scope.to || moment(), true);
            break;
        }

        $scope.mode = thisMode;
      };

      $scope.setQuick = function (from, to) {
        $scope.onFilterSelect({ from, to });
      };

      $scope.setToNow = function () {
        $scope.absolute.to = moment();
      };

      $scope.formatRelative = function (key) {
        const relativeString = getRelativeString(key);
        const parsed = dateMath.parse(relativeString);
        let preview;
        if (relativeString === 'now') {
          preview = 'Now';
        } else {
          preview = parsed ? parsed.format($scope.format) : undefined;
        }
        _.set($scope, `relative.${key}.preview`, preview);
        return parsed;
      };

      $scope.applyRelative = function () {
        $scope.onFilterSelect({
          from: getRelativeString('from'),
          to:  getRelativeString('to')
        });
      };

      function getRelativeString(key) {
        if (_.get($scope, `relative.${key}.count`) === 0) return 'now';
        let result = 'now-' + _.get($scope, `relative.${key}.count`);
        result += _.get($scope, `relative.${key}.unit`);
        result += (_.get($scope, `relative.${key}.round`) ? '/' + _.get($scope, `relative.${key}.unit`) : '');
        return result;
      }

      $scope.applyAbsolute = function () {
        $scope.onFilterSelect({
          from: moment($scope.absolute.from),
          to: moment($scope.absolute.to)
        });
      };

      $scope.setRefreshInterval = function (interval) {
        interval = _.clone(interval || {});
        notify.log('before: ' + interval.pause);
        interval.pause = (interval.pause == null || interval.pause === false) ? false : true;

        notify.log('after: ' + interval.pause);

        $scope.onIntervalSelect({ interval });
      };

      $scope.setMode($scope.mode);
    }
  };
});
