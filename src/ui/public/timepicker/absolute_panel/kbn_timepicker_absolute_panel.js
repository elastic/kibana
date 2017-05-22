import _ from 'lodash';
import moment from 'moment';
import template from './kbn_timepicker_absolute_panel.html';
import { uiModules } from 'ui/modules';

const module = uiModules.get('ui/timepicker');

module.directive('kbnTimepickerAbsolutePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      absolute: '=',
      applyAbsolute: '&',
      format: '=',
      setToNow: '&'
    },
    template,
    controller: function ($scope) {

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
    }
  };
});
