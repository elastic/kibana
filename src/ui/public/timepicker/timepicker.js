define(function (require) {
  var html = require('ui/timepicker/timepicker.html');
  var module = require('ui/modules').get('ui/timepicker');
  var _ = require('lodash');
  var dateMath = require('ui/utils/dateMath');
  var moment = require('moment');

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
        var init = function () {
          $scope.setMode($scope.mode);
        };

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
            count: 1,
            unit: 'm',
            preview: undefined,
            round: false
          }
        };

        $scope.absolute = {
          from: moment(),
          to: moment()
        };

        $scope.units = timeUnits;

        $scope.relativeOptions = {
          from: [
            {text: 'Seconds ago', value: 's'},
            {text: 'Minutes ago', value: 'm'},
            {text: 'Hours ago', value: 'h'},
            {text: 'Days ago', value: 'd'},
            {text: 'Weeks ago', value: 'w'},
            {text: 'Months ago', value: 'M'},
            {text: 'Years ago', value: 'y'}
          ],
          to: [
            {text: 'Seconds later', value: 's'},
            {text: 'Minutes later', value: 'm'},
            {text: 'Hours later', value: 'h'},
            {text: 'Days later', value: 'd'},
            {text: 'Weeks later', value: 'w'},
            {text: 'Months later', value: 'M'},
            {text: 'Years later', value: 'y'}
          ]
        };

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
              var durationTo = moment.duration(moment().diff(dateMath.parse($scope.to)));
              var durationFrom = moment.duration(moment().diff(dateMath.parse($scope.from)));

              var unitsTo = _.pluck(_.clone($scope.relativeOptions.to).reverse(), 'value');
              var unitsFrom = _.pluck(_.clone($scope.relativeOptions.from).reverse(), 'value');

              if ($scope.from.toString().split('/')[1]) $scope.relative.from.round = true;
              if ($scope.to.toString().split('/')[1]) $scope.relative.to.round = true;

              var i;

              for (i = 0; i < unitsTo.length; i++) {
                var asTo = durationTo.as(unitsTo[i]);

                if (asTo > 1) {
                  $scope.relative.to.count = Math.round(asTo);
                  $scope.relative.to.unit = unitsTo[i];
                  break;
                }
              }

              for (i = 0; i < unitsFrom.length; i++) {
                var asFrom = durationFrom.as(unitsFrom[i]);

                if (asFrom > 1) {
                  $scope.relative.from.count = Math.round(asFrom);
                  $scope.relative.from.unit = unitsFrom[i];
                  break;
                }
              }

              if ($scope.to.toString().split('/')[1]) $scope.relative.to.round = true;
              if ($scope.from.toString().split('/')[1]) $scope.relative.from.round = true;
              $scope.formatRelativeFrom();
              $scope.formatRelativeTo();

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

        $scope.formatRelativeFrom = function () {
          var parsed = dateMath.parse(getRelativeFromString());
          $scope.relative.from.preview = parsed ? parsed.format($scope.format) : undefined;
          return parsed;
        };

        $scope.formatRelativeTo = function () {
          var parsed = dateMath.parse(getRelativeToString());
          $scope.relative.to.preview = parsed ? parsed.format($scope.format) : undefined;
          return parsed;
        };

        $scope.applyRelative = function () {
          $scope.from = getRelativeFromString();
          $scope.to = getRelativeToString();
        };

        function getRelativeFromString() {
          return 'now-' + $scope.relative.from.count + $scope.relative.from.unit + (
              $scope.relative.from.round ? '/' + $scope.relative.from.unit : '');
        }

        function getRelativeToString() {
          return 'now+' + $scope.relative.to.count + $scope.relative.to.unit + (
              $scope.relative.to.round ? '/' + $scope.relative.to.unit : '');
        };

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
