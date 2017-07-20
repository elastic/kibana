import html from 'ui/timepicker/timepicker.html';
import _ from 'lodash';
import { relativeOptions } from './relative_options';
import { parseRelativeParts } from './parse_relative_parts';
import dateMath from '@elastic/datemath';
import moment from 'moment';
import { Notifier } from 'ui/notify/notifier';
import 'ui/timepicker/timepicker.less';
import 'ui/directives/input_datetime';
import 'ui/directives/inequality';
import 'ui/timepicker/quick_ranges';
import 'ui/timepicker/refresh_intervals';
import 'ui/timepicker/time_units';
import 'ui/timepicker/kbn_global_timepicker';
import { uiModules } from 'ui/modules';
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

      // If we always return a new object from the getters below (pickFromDate and pickToDate) we'll create an
      // infinite digest loop, so we maintain these copies to return instead.
      $scope.$watch('absolute.from', function (newDate) {
        _.set($scope, 'browserAbsolute.from', new Date(newDate.year(), newDate.month(), newDate.date()));
      });

      $scope.$watch('absolute.to', function (newDate) {
        _.set($scope, 'browserAbsolute.to', new Date(newDate.year(), newDate.month(), newDate.date()));
      });

      // The datepicker directive uses native Javascript Dates, ignoring moment's default timezone. This causes
      // the datepicker and the text input above it to get out of sync if the user changed the `dateFormat:tz` config
      // in advanced settings. The text input will show the date in the user selected timezone, the datepicker will
      // show the date in the local browser timezone. Since we really just want a day, month, year from the datepicker
      // instead of a moment in time, we grab those individual values from the native date.
      $scope.pickFromDate = function (date) {
        if (!date) return _.get($scope, 'browserAbsolute.from');

        const defaultTimeZoneDate = moment({
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
        });
        return $scope.absolute.from = defaultTimeZoneDate;
      };

      $scope.pickToDate = function (date) {
        if (!date) return _.get($scope, 'browserAbsolute.to');

        const defaultTimeZoneDate = moment({
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          hour: 23,
          minute: 59,
          second: 59,
          millisecond: 999,
        });
        return $scope.absolute.to = defaultTimeZoneDate;
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

      $scope.setToNow = function (key) {
        $scope.absolute[key] = moment();
      };

      $scope.setRelativeToNow = function (key) {
        $scope.relative[key].count = 0;
        $scope.relative[key].round = false;
        $scope.formatRelative(key);
      };

      $scope.checkRelative = function () {
        if ($scope.relative.from.count != null && $scope.relative.to.count != null) {
          const from = dateMath.parse(getRelativeString('from'));
          const to = dateMath.parse(getRelativeString('to'), true);
          if (to && from) return to.isBefore(from);
          return true;
        }
      };

      $scope.formatRelative = function (key) {
        const relativeString = getRelativeString(key);
        const parsed = dateMath.parse(relativeString, key === 'to');
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
        const count = _.get($scope, `relative.${key}.count`, 0);
        const round = _.get($scope, `relative.${key}.round`, false);
        const matches = _.get($scope, `relative.${key}.unit`, 's').match(/([smhdwMy])(\+)?/);
        let unit;
        let operator = '-';
        if (matches && matches[1]) unit = matches[1];
        if (matches && matches[2]) operator = matches[2];
        if (count === 0 && !round) return 'now';
        let result = `now${operator}${count}${unit}`;
        result += (round ? '/' + unit : '');
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
