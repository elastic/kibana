define(function (require) {
  let html = require('ui/timepicker/timepicker.html');
  let module = require('ui/modules').get('ui/timepicker');
  let _ = require('lodash');
  let dateMath = require('ui/utils/dateMath');
  let moment = require('moment');

  require('ui/directives/input_datetime');
  require('ui/directives/inequality');
  require('ui/timepicker/quick_ranges');
  require('ui/timepicker/refresh_intervals');
  require('ui/timepicker/time_units');
  require('ui/timepicker/toggle');

  module.directive('kbnTimepicker', function (quickRanges, timeUnits, refreshIntervals) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '=',
        mode: '=',
        interval: '=',
        activeTab: '='
      },
      template: html,
      controller: function ($scope) {
        let init = function () {
          $scope.setMode($scope.mode);
        };

        $scope.format = 'MMMM Do YYYY, HH:mm:ss.SSS';
        $scope.modes = ['quick', 'relative', 'absolute'];
        $scope.activeTab = $scope.activeTab || 'filter';

        if (_.isUndefined($scope.mode)) $scope.mode = 'quick';

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
          {text: 'Seconds ago', value: 's'},
          {text: 'Minutes ago', value: 'm'},
          {text: 'Hours ago', value: 'h'},
          {text: 'Days ago', value: 'd'},
          {text: 'Weeks ago', value: 'w'},
          {text: 'Months ago', value: 'M'},
          {text: 'Years ago', value: 'y'},
        ];

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
              let fromParts = $scope.from.toString().split('-');
              let relativeParts = [];

              // Try to parse the relative time, if we can't use moment duration to guestimate
              if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
                relativeParts = fromParts[1].match(/([0-9]+)([smhdwMy]).*/);
              }
              if (relativeParts[1] && relativeParts[2]) {
                $scope.relative.count = parseInt(relativeParts[1], 10);
                $scope.relative.unit = relativeParts[2];
              } else {
                let duration = moment.duration(moment().diff(dateMath.parse($scope.from)));
                let units = _.pluck(_.clone($scope.relativeOptions).reverse(), 'value');
                if ($scope.from.toString().split('/')[1]) $scope.relative.round = true;
                for (let i = 0; i < units.length; i++) {
                  let as = duration.as(units[i]);
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
              $scope.absolute.from = dateMath.parse($scope.from || moment().subtract('minutes', 15));
              $scope.absolute.to = dateMath.parse($scope.to || moment(), true);
              break;
          }

          $scope.mode = thisMode;
        };

        $scope.setQuick = function (from, to, description) {
          $scope.from = from;
          $scope.to = to;
        };

        $scope.setToNow = function () {
          $scope.absolute.to = moment();
        };

        $scope.formatRelative = function () {
          let parsed = dateMath.parse(getRelativeString());
          $scope.relative.preview =  parsed ? parsed.format($scope.format) : undefined;
          return parsed;
        };

        $scope.applyRelative = function () {
          $scope.from = getRelativeString();
          $scope.to = 'now';
        };

        function getRelativeString() {
          return 'now-' + $scope.relative.count + $scope.relative.unit + ($scope.relative.round ? '/' + $scope.relative.unit : '');
        }

        $scope.applyAbsolute = function () {
          $scope.from = moment($scope.absolute.from);
          $scope.to = moment($scope.absolute.to);
        };

        $scope.setRefreshInterval = function (interval) {
          interval = _.clone(interval);
          console.log('before: ' + interval.pause);
          interval.pause = (interval.pause == null || interval.pause === false) ? false : true;

          console.log('after: ' + interval.pause);
          $scope.interval = interval;
        };

        init();
      }
    };
  });

});
